import type { JsonRpcErrorObject } from '../daemonProtocol';

/**
 * Что это: доменная ошибка JSON-RPC клиента daemon.
 * Зачем нужно: вызывающий код получает код и data из daemon, а не только текст сообщения.
 * Какую продуктовую проблему решает: UI и CLI могут показать пользователю точную причину сбоя фонового агента.
 */
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
