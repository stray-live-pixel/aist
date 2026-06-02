export function stringifyToolArguments(value: string | Record<string, unknown> | undefined): string {
  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value || {});
}
