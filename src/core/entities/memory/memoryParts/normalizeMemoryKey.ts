export function normalizeMemoryKey(note: string): string {
  return note.replace(/\s+/g, ' ').trim().toLowerCase();
}
