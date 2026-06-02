export function readEnvValue(
  env: Record<string, string | undefined> | undefined,
  envKey: string | undefined
): string | undefined {
  if (!env || !envKey) {
    return undefined;
  }

  const value = env[envKey];
  return value === undefined || value === '' ? undefined : value;
}
