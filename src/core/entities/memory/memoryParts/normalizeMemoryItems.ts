import { AgentMemoryItem } from './AgentMemoryItem';
import { AgentMemoryScope } from './AgentMemoryScope';
import { DEFAULT_MEMORY_IMPORTANCE } from './DEFAULT_MEMORY_IMPORTANCE';
import { normalizeMemoryImportance } from './normalizeMemoryImportance';
import { sortMemoryItems } from './sortMemoryItems';

/**
 * Что это: восстанавливает заметки памяти из persisted JSON.
 * Зачем нужно: старые и новые файлы памяти приводятся к единому виду с весом полезности.
 * Какую продуктовую проблему решает: агент безопасно читает память после обновлений версии.
 */
export function normalizeMemoryItems(raw: unknown, scope: AgentMemoryScope): AgentMemoryItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return sortMemoryItems({
    items: raw
      .filter((item) => item && typeof item === 'object')
      .map((item) => item as Record<string, unknown>)
      .filter((item) => typeof item.id === 'string' && typeof item.note === 'string')
      .map((item) => ({
        id: String(item.id),
        scope,
        note: String(item.note),
        enabled: item.enabled !== false,
        importance: normalizeMemoryImportance({ value: item.importance, fallback: DEFAULT_MEMORY_IMPORTANCE }),
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : 0,
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : 0
      }))
  });
}
