import type { RuntimeEvent } from '../../../core/shared/types/types';

/**
 * Что это: достаёт chatId из runtime-события агента.
 * Зачем нужно: daemon помечает дополнительный state.changed конкретным чатом и не заставляет clients перечитывать все чаты.
 * Какую продуктовую проблему решает: параллельные агенты не тормозят друг друга лишними full refresh при обычном progress-событии.
 */
export function getRuntimeEventChatId({ event }: { event: RuntimeEvent }): string | undefined {
  if ('chatId' in event && typeof event.chatId === 'string') {
    return event.chatId;
  }

  if ('run' in event && typeof event.run.chatId === 'string') {
    return event.run.chatId;
  }

  return undefined;
}
