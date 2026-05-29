import type { DaemonEvent } from '../../../cli/daemonProtocol';

/**
 * Что это: достаёт chatId из разных форм daemon-событий.
 * Зачем нужно: часть runtime events хранит chatId на верхнем уровне, а run.started/run.finished — внутри run;
 * единый helper не даёт транспортному слою пропускать patch из-за различий формы события.
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
