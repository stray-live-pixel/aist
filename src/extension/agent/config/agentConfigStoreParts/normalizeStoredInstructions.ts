import { StoredInstructionItem } from './StoredInstructionItem';

export function normalizeStoredInstructions(raw: unknown): StoredInstructionItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => item as Record<string, unknown>)
    .filter((item) => typeof item.id === 'string' && typeof item.label === 'string')
    .map((item) => ({
      id: String(item.id),
      label: String(item.label),
      content: typeof item.content === 'string' ? item.content : ''
    }));
}
