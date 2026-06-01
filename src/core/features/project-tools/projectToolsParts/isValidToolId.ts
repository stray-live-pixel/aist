export function isValidToolId(value: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_-]{0,63}$/.test(value);
}
