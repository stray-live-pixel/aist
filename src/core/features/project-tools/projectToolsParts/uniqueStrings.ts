export function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
