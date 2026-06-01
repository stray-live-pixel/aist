import type { DaemonEvent } from '../../../cli/daemonProtocol';

/**
 * Что это: достаёт chatId из разных форм daemon-событий.
 * Зачем нужно: runtime events и chat-scoped state.changed хранят chatId на верхнем уровне,
 * а run.started/run.finished — внутри run; единый helper не даёт bridge делать полный refresh без необходимости.
 */
export function getDaemonEventChatId(event: DaemonEvent): string | undefined {
  if ('chatId' in event && typeof event.chatId === 'string') {
    return event.chatId;
  }

  if ('run' in event && typeof event.run.chatId === 'string') {
    return event.run.chatId;
  }

  return undefined;
}
