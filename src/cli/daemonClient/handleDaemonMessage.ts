import {
  DAEMON_EVENT_METHOD,
  type JsonRpcNotification,
  type JsonRpcRequest,
  type JsonRpcResponse
} from '../daemonProtocol';
import { handleDaemonNotification } from './handleDaemonNotification';
import { type SendDaemonResponse, handleDaemonRequest } from './handleDaemonRequest';
import { type DaemonPendingRequests, handleDaemonResponse } from './handleDaemonResponse';
import type { DaemonEventHandler, DaemonRequestHandler } from './types';

/**
 * Что это: зависимости маршрутизатора входящих JSON-RPC сообщений клиента.
 * Зачем нужно: parsing, pending responses и client callbacks остаются в одном явном контракте.
 * Какую продуктовую проблему решает: daemon-события, ответы и обратные запросы не смешиваются в монолитном классе.
 */
export type HandleDaemonMessageOptions = {
  line: string;
  pending: DaemonPendingRequests;
  eventHandlers: Set<DaemonEventHandler>;
  requestHandlers: Map<string, DaemonRequestHandler>;
  sendResponse: SendDaemonResponse;
};

/**
 * Что это: маршрутизирует одну JSON-RPC строку от daemon.
 * Зачем нужно: клиентский транспорт остаётся простым, а тип сообщения определяется в одном месте.
 * Какую продуктовую проблему решает: CLI и webview одинаково устойчивы к невалидным или неожиданным сообщениям daemon.
 */
export function handleDaemonMessage({
  line,
  pending,
  eventHandlers,
  requestHandlers,
  sendResponse
}: HandleDaemonMessageOptions): void {
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
    handleDaemonResponse({ pending, response: record as JsonRpcResponse });
    return;
  }

  if ('id' in record && typeof record.method === 'string') {
    void handleDaemonRequest({ request: record as JsonRpcRequest, requestHandlers, sendResponse });
    return;
  }

  if (record.method === DAEMON_EVENT_METHOD) {
    handleDaemonNotification({ eventHandlers, notification: record as JsonRpcNotification });
  }
}
