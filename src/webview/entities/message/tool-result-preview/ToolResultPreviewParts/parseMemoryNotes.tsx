export function parseMemoryNotes(input: { notes: string }): string[] {
  return input.notes
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace(/^-\s+/, '').trim())
    .filter(Boolean);
}
