import type { JsonRpcResponse } from '../daemonProtocol';
import { DaemonJsonRpcError } from './DaemonJsonRpcError';

/**
 * Что это: состояние ожидающих JSON-RPC ответов клиента.
 * Зачем нужно: отправленный запрос должен найти свой resolve/reject по id ответа.
 * Какую продуктовую проблему решает: команды CLI и webview получают результат именно своего фонового запроса.
 */
export type DaemonPendingRequests = Map<number, { resolve(value: unknown): void; reject(error: unknown): void }>;

/**
 * Что это: завершает ожидающий запрос по JSON-RPC response от daemon.
 * Зачем нужно: основной клиент отвечает только за транспорт, а обработка result/error живёт отдельно.
 * Какую продуктовую проблему решает: ошибки фонового агента доходят до UI/CLI в предсказуемом формате.
 */
export function handleDaemonResponse({
  pending,
  response
}: {
  pending: DaemonPendingRequests;
  response: JsonRpcResponse;
}): void {
  if (typeof response.id !== 'number') {
    return;
  }

  const pendingRequest = pending.get(response.id);
  if (!pendingRequest) {
    return;
  }

  pending.delete(response.id);
  if (response.error) {
    pendingRequest.reject(new DaemonJsonRpcError(response.error));
    return;
  }

  pendingRequest.resolve(response.result);
}
