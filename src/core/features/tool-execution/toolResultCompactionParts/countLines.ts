export function countLines(value: string): number {
  return value ? value.split(/\r?\n/).length : 0;
}
