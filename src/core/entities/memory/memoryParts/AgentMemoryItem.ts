import { AgentMemoryScope } from './AgentMemoryScope';

/**
 * Что это: одна сохранённая заметка памяти агента.
 * Зачем нужно: агент хранит короткие reusable правила и предпочтения между задачами.
 * Какую продуктовую проблему решает: будущие ответы используют важный опыт без повторного объяснения пользователем.
 */
export type AgentMemoryItem = {
  id: string;
  scope: AgentMemoryScope;
  note: string;
  enabled: boolean;
  /** Вес полезности 1..100; чем выше, тем важнее держать заметку в памяти. */
  importance: number;
  createdAt: number;
  updatedAt: number;
};
