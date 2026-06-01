import type { Chat } from '../../../chats/types';

/**
 * Что это: приводит activity из daemon payload к поддерживаемому extension state.
 * Зачем нужно: daemon может прислать null или неизвестное значение из будущей версии.
 * Какую проблему решает: UI не ломается на несовместимом activity и показывает безопасное пустое состояние.
 */
export function normalizeActivity({ value }: { value: unknown }): Chat['activity'] {
  return value === 'thinking' ||
    value === 'waitingForApproval' ||
    value === 'runningTool' ||
    value === 'answering' ||
    value === 'stopping'
    ? value
    : undefined;
}
