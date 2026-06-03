import { AgentMemoryScope } from './AgentMemoryScope';

/**
 * Что это: audit-событие изменения памяти.
 * Зачем нужно: можно понять, какая заметка была добавлена, заменена, выключена или удалена.
 * Какую продуктовую проблему решает: автоматическая память остаётся наблюдаемой для пользователя и QA.
 */
export type AgentMemoryEvent = {
  timestamp: number;
  action: 'add' | 'replace' | 'delete' | 'setEnabled';
  scope: AgentMemoryScope;
  itemId: string;
  replacedItemId?: string;
  enabled?: boolean;
};
