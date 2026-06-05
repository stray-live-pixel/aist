import { asString } from '../../tool-value';

export function getMemoryNoteCount(result: Record<string, unknown>): number {
  const notes = asString(result.notes) || '';
  return notes
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- ')).length;
}
