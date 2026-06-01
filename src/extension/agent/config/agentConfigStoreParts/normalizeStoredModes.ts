import { StoredModeItem } from './StoredModeItem';

export function normalizeStoredModes(raw: unknown): StoredModeItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => item as Record<string, unknown>)
    .filter((item) => typeof item.id === 'string' && typeof item.label === 'string')
    .map((item) => ({
      id: String(item.id),
      label: String(item.label),
      instructions: typeof item.instructions === 'string' ? item.instructions : ''
    }));
}
