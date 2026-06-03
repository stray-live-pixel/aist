import { AgentMemoryScope } from './AgentMemoryScope';

/**
 * Что это: новая заметка, которую можно сохранить в память.
 * Зачем нужно: ручной и автоматический анализ чата передают в store одинаковую доменную модель.
 * Какую продуктовую проблему решает: каждая заметка сразу получает критерий полезности для будущих замен.
 */
export type AgentMemoryCandidate = {
  scope: AgentMemoryScope;
  note: string;
  importance?: number;
};
