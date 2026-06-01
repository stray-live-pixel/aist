import { AgentMemoryItem } from './AgentMemoryItem';
import { AgentMemoryScope } from './AgentMemoryScope';

export function normalizeMemoryItems(raw: unknown, scope: AgentMemoryScope): AgentMemoryItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => item as Record<string, unknown>)
    .filter((item) => typeof item.id === 'string' && typeof item.note === 'string')
    .map((item) => ({
      id: String(item.id),
      scope,
      note: String(item.note),
      enabled: item.enabled !== false,
      createdAt: typeof item.createdAt === 'number' ? item.createdAt : 0,
      updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : 0
    }));
}
