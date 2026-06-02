import { MAX_NOTE_CHARS } from './MAX_NOTE_CHARS';
import { containsUnsafeMemoryContent } from './containsUnsafeMemoryContent';

export function sanitizeMemoryNote(input: string): string | undefined {
  const normalized = String(input || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
  if (!normalized) {
    return undefined;
  }

  const truncated = normalized.length > MAX_NOTE_CHARS ? normalized.slice(0, MAX_NOTE_CHARS).trim() : normalized;
  if (containsUnsafeMemoryContent(truncated)) {
    return undefined;
  }

  return truncated;
}
