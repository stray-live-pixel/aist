import net from 'node:net';

import {
  DAEMON_EVENT_METHOD,
  type DaemonClientRequestMap,
  type DaemonClientRequestMethod,
  type DaemonEvent,
  type DaemonEventsSubscribeResult,
  type JsonRpcErrorObject,
  type JsonRpcId,
  type JsonRpcNotification,
  type JsonRpcRequest,
  type JsonRpcResponse
} from './daemonProtocol';

export type DaemonJsonRpcClientOptions = {
  readonly socketPath: string;
};

export type DaemonEventHandler = (event: DaemonEvent) => void;
export type DaemonRequestHandler<Method extends DaemonClientRequestMethod = DaemonClientRequestMethod> = (
  params: DaemonClientRequestMap[Method]['params']
) => Promise<DaemonClientRequestMap[Method]['result']> | DaemonClientRequestMap[Method]['result'];

export class DaemonJsonRpcError extends Error {
  readonly code: number;
  readonly data?: JsonRpcErrorObject['data'];

  constructor(error: JsonRpcErrorObject) {
    super(error.message);
    this.name = 'DaemonJsonRpcError';
    this.code = error.code;
    this.data = error.data;
  }
}

export class DaemonJsonRpcClient {
  private readonly pending = new Map<number, { resolve(value: unknown): void; reject(error: unknown): void }>();
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
    socket.on('data', (chunk) => this.handleData(chunk));
    socket.on('error', (error) => this.rejectPending(error));
    socket.on('close', () => {
      this.closed = true;
      this.rejectPending(new Error('Daemon JSON-RPC socket closed.'));
    });
  }

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

  request<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (this.closed || this.socket.destroyed) {
      return Promise.reject(new Error('Daemon JSON-RPC socket is closed.'));
    }

    const id = this.nextId++;
    const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params });
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject
      });
      this.socket.write(`${payload}\n`, (error) => {
        if (!error) {
          return;
        }

        this.pending.delete(id);
        reject(error);
      });
    });
  }

  notify(method: string, params?: unknown): void {
    if (this.closed || this.socket.destroyed) {
      return;
    }

    this.socket.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
  }

  subscribe(): Promise<DaemonEventsSubscribeResult> {
    return this.request<DaemonEventsSubscribeResult>('events.subscribe');
  }

  unsubscribe(): Promise<DaemonEventsSubscribeResult> {
    return this.request<DaemonEventsSubscribeResult>('events.unsubscribe');
  }

  onEvent(handler: DaemonEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => {
      this.eventHandlers.delete(handler);
    };
  }

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

  close(): void {
    this.closed = true;
    this.socket.end();
    this.socket.destroy();
  }

  private handleData(chunk: string | Buffer): void {
    this.buffer += chunk.toString();
    while (true) {
      const newlineIndex = this.buffer.indexOf('\n');
      if (newlineIndex === -1) {
        return;
      }

      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (line) {
        this.handleMessage(line);
      }
    }
  }

  private handleMessage(line: string): void {
    let message: unknown;
    try {
      message = JSON.parse(line) as unknown;
    } catch {
      return;
    }

    if (!message || typeof message !== 'object') {
      return;
    }

    const record = message as Record<string, unknown>;
    if ('id' in record && ('result' in record || 'error' in record)) {
      this.handleResponse(record as JsonRpcResponse);
      return;
    }

    if ('id' in record && typeof record.method === 'string') {
      void this.handleRequest(record as JsonRpcRequest);
      return;
    }

    if (record.method === DAEMON_EVENT_METHOD) {
      this.handleNotification(record as JsonRpcNotification);
    }
  }

  private handleResponse(response: JsonRpcResponse): void {
    if (typeof response.id !== 'number') {
      return;
    }

    const pending = this.pending.get(response.id);
    if (!pending) {
      return;
    }

    this.pending.delete(response.id);
    if (response.error) {
      pending.reject(new DaemonJsonRpcError(response.error));
      return;
    }

    pending.resolve(response.result);
  }

  private handleNotification(notification: JsonRpcNotification): void {
    if (notification.method !== DAEMON_EVENT_METHOD || !isDaemonEvent(notification.params)) {
      return;
    }

    for (const handler of [...this.eventHandlers]) {
      handler(notification.params);
    }
  }

  private async handleRequest(request: JsonRpcRequest): Promise<void> {
    const id = request.id ?? null;
    const handler = this.requestHandlers.get(request.method);
    if (!handler) {
      this.sendResponse({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method not found: ${request.method}`,
          data: { code: 'method.notFound' }
        }
      });
      return;
    }

    try {
      const result = await handler(request.params as never);
      this.sendResponse({ jsonrpc: '2.0', id, result });
    } catch (error) {
      this.sendResponse({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : String(error),
          data: { code: 'client.requestFailed' }
        }
      });
    }
  }

  private sendResponse(response: {
    jsonrpc: '2.0';
    id: JsonRpcId;
    result?: unknown;
    error?: JsonRpcErrorObject;
  }): void {
    if (this.closed || this.socket.destroyed) {
      return;
    }

    this.socket.write(`${JSON.stringify(response)}\n`);
  }

  private rejectPending(error: unknown): void {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }
}

function isDaemonEvent(value: unknown): value is DaemonEvent {
  return Boolean(value) && typeof value === 'object' && typeof (value as { type?: unknown }).type === 'string';
}
