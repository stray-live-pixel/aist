export function hasErrorCode(error: unknown): error is { code: string } {
  return Boolean(error && typeof error === 'object' && 'code' in error && typeof error.code === 'string');
}
