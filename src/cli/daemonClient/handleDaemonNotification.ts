import { DAEMON_EVENT_METHOD, type JsonRpcNotification } from '../daemonProtocol';
import { isDaemonEvent } from './isDaemonEvent';
import type { DaemonEventHandler } from './types';

/**
 * Что это: доставляет подписчикам валидное event-уведомление daemon.
 * Зачем нужно: транспорт получает разные JSON-RPC notification, а UI интересуют только события daemon.
 * Какую продуктовую проблему решает: webview обновляется по фоновым событиям и игнорирует мусорные сообщения.
 */
export function handleDaemonNotification({
  eventHandlers,
  notification
}: {
  eventHandlers: Set<DaemonEventHandler>;
  notification: JsonRpcNotification;
}): void {
  const candidate = { value: notification.params };
  if (notification.method !== DAEMON_EVENT_METHOD || !isDaemonEvent(candidate)) {
    return;
  }

  for (const handler of [...eventHandlers]) {
    handler(candidate.value);
  }
}
