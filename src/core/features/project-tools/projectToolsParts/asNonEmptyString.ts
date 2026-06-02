export function asNonEmptyString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
