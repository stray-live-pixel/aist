export function isValidStoreKey(key: string): boolean {
  return (
    typeof key === 'string' &&
    key.trim() === key &&
    key.length > 0 &&
    !key.includes('\0') &&
    !key.split('.').some((segment) => segment.length === 0)
  );
}
