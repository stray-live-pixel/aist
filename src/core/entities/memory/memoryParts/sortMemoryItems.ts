import type { AgentMemoryItem } from './AgentMemoryItem';

/**
 * Что это: сортирует заметки по полезности и свежести.
 * Зачем нужно: самые важные правила быстрее попадают в prompt и интерфейс.
 * Какую продуктовую проблему решает: при ограниченной памяти агент в первую очередь учитывает ценные знания.
 */
export function sortMemoryItems(input: { items: AgentMemoryItem[] }): AgentMemoryItem[] {
  return [...input.items].sort((left, right) => {
    const leftImportance = left.importance ?? 0;
    const rightImportance = right.importance ?? 0;
    return rightImportance - leftImportance || right.updatedAt - left.updatedAt;
  });
}
