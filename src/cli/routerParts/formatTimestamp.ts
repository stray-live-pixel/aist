export function formatTimestamp(value: number): string {
  return new Date(value).toISOString();
}
