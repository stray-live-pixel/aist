import type { AgentMemoryItem } from '../../../entities/memory/memory';

/**
 * Что это: сериализует заметки памяти для AI-субагента.
 * Зачем нужно: модель выбирает заметки по стабильным id, а не пересказывает их свободным текстом.
 */
export function formatMemoryItemsForSubagent(input: { items: AgentMemoryItem[] }): string {
  const enabledItems = input.items.filter((item) => item.enabled);
  if (!enabledItems.length) {
    return 'Нет включённых заметок памяти.';
  }

  return enabledItems
    .map(
      (item) =>
        `- id=${item.id}; scope=${item.scope}; importance=${item.importance ?? 50}; note=${item.note.replace(/\s+/g, ' ').trim()}`
    )
    .join('\n');
}
