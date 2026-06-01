import type { JsonObject } from '../../core/shared/types/types';

/**
 * Что это: внутренняя ошибка daemon, которая напрямую мапится в JSON-RPC error.
 * Зачем нужно: handlers передают код, product-code и details без ручной сборки ответа.
 * Какую продуктовую проблему решает: клиент получает предсказуемые ошибки для busy/auth/notFound/invalid params.
 */
export class DaemonRpcError extends Error {
  constructor(
    readonly rpcCode: number,
    readonly code: string,
    message: string,
    readonly details: JsonObject = {}
  ) {
    super(message);
    this.name = 'DaemonRpcError';
  }
}
