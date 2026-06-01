import net from 'node:net';

import type {
  DaemonClientRequestMethod,
  DaemonEventsSubscribeResult,
  JsonRpcErrorObject,
  JsonRpcId
} from '../daemonProtocol';
import { handleDaemonMessage } from './handleDaemonMessage';
import type { DaemonPendingRequests } from './handleDaemonResponse';
import type { DaemonEventHandler, DaemonJsonRpcClientOptions, DaemonRequestHandler } from './types';

/**
 * Что это: JSON-RPC клиент для подключения CLI/extension к локальному AIST daemon.
 * Зачем нужно: один транспорт отправляет команды, принимает события и обслуживает обратные запросы daemon.
 * Какую продуктовую проблему решает: пользователь может управлять фоновым агентом из разных entrypoint без дублирования IPC.
 */
export class DaemonJsonRpcClient {
  private readonly pending: DaemonPendingRequests = new Map();
  private readonly eventHandlers = new Set<DaemonEventHandler>();
  private readonly requestHandlers = new Map<string, DaemonRequestHandler>();
  private nextId = 1;
  private buffer = '';
  private closed = false;

  private constructor(
    private readonly socket: net.Socket,
    readonly socketPath: string
  ) {
    socket.setEncoding('utf8');
    socket.on('data', (chunk) => this.handleData({ chunk }));
    socket.on('error', (error) => this.rejectPending({ error }));
    socket.on('close', () => this.closeAfterSocketEnd());
  }

  /**
   * Что это: открывает socket-подключение к daemon и создаёт JSON-RPC клиент.
   * Зачем нужно: вызывающий код получает готовый клиент только после успешного connect.
   * Какую продуктовую проблему решает: команды не стартуют, пока daemon socket ещё недоступен.
   */
  static connect(options: DaemonJsonRpcClientOptions): Promise<DaemonJsonRpcClient> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(options.socketPath);
      const onError = (error: Error) => {
        socket.destroy();
        reject(error);
      };
      socket.once('error', onError);
      socket.once('connect', () => {
        socket.off('error', onError);
        resolve(new DaemonJsonRpcClient(socket, options.socketPath));
      });
    });
  }

  /**
   * Что это: отправляет JSON-RPC request и ждёт result daemon.
   * Зачем нужно: все команды CLI/extension используют один механизм request/response.
   * Какую продуктовую проблему решает: пользователь получает результат именно той фоновой операции, которую запустил.
   */
  request<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (this.closed || this.socket.destroyed) {
      return Promise.reject(new Error('Daemon JSON-RPC socket is closed.'));
    }

    const id = this.nextId++;
    const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params });
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: (value) => resolve(value as T), reject });
      this.socket.write(`${payload}\n`, (error) => {
        if (!error) {
          return;
        }

        this.pending.delete(id);
        reject(error);
      });
    });
  }

  /**
   * Что это: отправляет JSON-RPC notification без ожидания ответа.
   * Зачем нужно: некоторые сигналы клиент должен передать daemon fire-and-forget.
   * Какую продуктовую проблему решает: UI может быстро сообщить daemon о событии без блокировки пользователя.
   */
  notify(method: string, params?: unknown): void {
    if (this.closed || this.socket.destroyed) {
      return;
    }

    this.socket.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
  }

  /**
   * Что это: подписывает клиента на события daemon.
   * Зачем нужно: daemon начинает присылать notification о состоянии фоновых сценариев.
   * Какую продуктовую проблему решает: webview и CLI видят прогресс без ручного обновления.
   */
  subscribe(): Promise<DaemonEventsSubscribeResult> {
    return this.request<DaemonEventsSubscribeResult>('events.subscribe');
  }

  /**
   * Что это: снимает подписку клиента на события daemon.
   * Зачем нужно: закрытые панели и команды не должны получать лишние notification.
   * Какую продуктовую проблему решает: фоновые подключения не копят ненужные обработчики.
   */
  unsubscribe(): Promise<DaemonEventsSubscribeResult> {
    return this.request<DaemonEventsSubscribeResult>('events.unsubscribe');
  }

  /**
   * Что это: регистрирует обработчик daemon events.
   * Зачем нужно: разные части extension могут независимо реагировать на изменения фона.
   * Какую продуктовую проблему решает: экран обновляется сразу после события daemon.
   */
  onEvent(handler: DaemonEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => {
      this.eventHandlers.delete(handler);
    };
  }

  /**
   * Что это: регистрирует обработчик обратного запроса daemon.
   * Зачем нужно: daemon может обратиться к клиенту за интерактивным действием.
   * Какую продуктовую проблему решает: approval и подобные сценарии не теряют контекст пользователя.
   */
  onRequest<Method extends DaemonClientRequestMethod>(
    method: Method,
    handler: DaemonRequestHandler<Method>
  ): () => void {
    const storedHandler = handler as unknown as DaemonRequestHandler;
    this.requestHandlers.set(method, storedHandler);
    return () => {
      if (this.requestHandlers.get(method) === storedHandler) {
        this.requestHandlers.delete(method);
      }
    };
  }

  /**
   * Что это: закрывает socket и очищает клиентское состояние.
   * Зачем нужно: dispose extension/CLI не должен оставлять висящие IPC-подключения.
   * Какую продуктовую проблему решает: повторный запуск не сталкивается со старыми подписками.
   */
  close(): void {
    this.closed = true;
    this.socket.end();
    this.socket.destroy();
  }

  private handleData({ chunk }: { chunk: string | Buffer }): void {
    this.buffer += chunk.toString();
    while (true) {
      const newlineIndex = this.buffer.indexOf('\n');
      if (newlineIndex === -1) {
        return;
      }

      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (line) {
        this.handleMessage({ line });
      }
    }
  }

  private handleMessage({ line }: { line: string }): void {
    handleDaemonMessage({
      line,
      pending: this.pending,
      eventHandlers: this.eventHandlers,
      requestHandlers: this.requestHandlers,
      sendResponse: (response) => this.sendResponse({ response })
    });
  }

  private sendResponse({
    response
  }: {
    response: { jsonrpc: '2.0'; id: JsonRpcId; result?: unknown; error?: JsonRpcErrorObject };
  }): void {
    if (this.closed || this.socket.destroyed) {
      return;
    }

    this.socket.write(`${JSON.stringify(response)}\n`);
  }

  private rejectPending({ error }: { error: unknown }): void {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }

  private closeAfterSocketEnd(): void {
    this.closed = true;
    this.rejectPending({ error: new Error('Daemon JSON-RPC socket closed.') });
  }
}
