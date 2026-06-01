import type { JsonObject } from '../../core/shared/types/types';
import type { JsonRpcErrorObject, JsonRpcRequest, JsonRpcResponse } from '../daemonProtocol';
import { DaemonRpcError } from './DaemonRpcError';

/**
 * Что это: проверяет корректность входящего JSON-RPC request.
 * Зачем нужно: daemon должен отсеивать мусор до dispatch handlers.
 * Какую продуктовую проблему решает: клиент получает standard request.invalid вместо неявного crash.
 */
export function isValidJsonRpcRequest(value: unknown): value is JsonRpcRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const request = value as JsonRpcRequest;
  return request.jsonrpc === '2.0' && typeof request.method === 'string';
}

/**
 * Что это: проверяет, является ли сообщение ответом клиента на daemon request.
 * Зачем нужно: daemon умеет делать обратные client.* запросы и должен сопоставлять ответы.
 * Какую продуктовую проблему решает: preview/editor context callbacks работают по одному socket protocol.
 */
export function isJsonRpcResponse(value: unknown): value is JsonRpcResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const response = value as JsonRpcResponse;
  return response.jsonrpc === '2.0' && 'id' in response && ('result' in response || 'error' in response);
}

/**
 * Что это: собирает JSON-RPC error object с product data.code.
 * Зачем нужно: все errors daemon имеют одинаковую форму для клиентов.
 * Какую продуктовую проблему решает: UI может ветвиться по data.code без парсинга текста.
 */
export function createJsonRpcError({
  code,
  dataCode,
  message,
  details = {}
}: {
  code: number;
  dataCode: string;
  message: string;
  details?: JsonObject;
}): JsonRpcErrorObject {
  return { code, message, data: { code: dataCode, ...details } };
}

/**
 * Что это: преобразует thrown error в JSON-RPC error object.
 * Зачем нужно: handlers могут бросать обычные Error или DaemonRpcError.
 * Какую продуктовую проблему решает: клиент всегда получает валидный JSON-RPC response.
 */
export function toJsonRpcError({ error }: { error: unknown }): JsonRpcErrorObject {
  if (error instanceof DaemonRpcError) {
    return createJsonRpcError({
      code: error.rpcCode,
      dataCode: error.code,
      message: error.message,
      details: error.details
    });
  }
  const message = error instanceof Error ? error.message : String(error);
  return createJsonRpcError({ code: -32603, dataCode: 'internal.error', message });
}
