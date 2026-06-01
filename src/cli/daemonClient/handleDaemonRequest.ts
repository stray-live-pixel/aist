import type { JsonRpcErrorObject, JsonRpcId, JsonRpcRequest } from '../daemonProtocol';
import type { DaemonRequestHandler } from './types';

/**
 * Что это: функция отправки JSON-RPC ответа обратно daemon.
 * Зачем нужно: обработчик запроса не должен знать детали socket-транспорта.
 * Какую продуктовую проблему решает: интерактивные ответы extension остаются совместимыми с любым транспортом клиента.
 */
export type SendDaemonResponse = (response: {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result?: unknown;
  error?: JsonRpcErrorObject;
}) => void;

/**
 * Что это: обрабатывает JSON-RPC request, который daemon отправил подключённому клиенту.
 * Зачем нужно: daemon может запросить пользовательское действие, а клиент возвращает result или понятную ошибку.
 * Какую продуктовую проблему решает: approval и другие интерактивные сценарии работают без блокировки фонового процесса.
 */
export async function handleDaemonRequest({
  request,
  requestHandlers,
  sendResponse
}: {
  request: JsonRpcRequest;
  requestHandlers: Map<string, DaemonRequestHandler>;
  sendResponse: SendDaemonResponse;
}): Promise<void> {
  const id = request.id ?? null;
  const handler = requestHandlers.get(request.method);
  if (!handler) {
    sendResponse({
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
    sendResponse({ jsonrpc: '2.0', id, result });
  } catch (error) {
    sendResponse({
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
