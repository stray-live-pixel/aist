export function createMemoryId(note: string, existingIds: string[]): string {
  const base =
    note
      .toLowerCase()
      .slice(0, 48)
      .replace(/[^a-z0-9\u0400-\u04FF]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'memory';
  let id = base;
  let index = 1;
  while (existingIds.includes(id)) {
    id = `${base}-${index}`;
    index += 1;
  }
  return id;
}
