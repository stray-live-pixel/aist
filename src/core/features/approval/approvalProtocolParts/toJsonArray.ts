export function toJsonArray(value: unknown[] | undefined): unknown[] | undefined {
  if (!value?.length) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as unknown[];
}
