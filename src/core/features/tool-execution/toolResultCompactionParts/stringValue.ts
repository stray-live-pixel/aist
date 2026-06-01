export function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
