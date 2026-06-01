import { ResolveSecretValueOptions } from './ResolveSecretValueOptions';
import { SecretStore } from './SecretStore';
import { readEnvValue } from './readEnvValue';

export async function resolveSecretValue(
  store: Pick<SecretStore, 'get'>,
  key: string,
  options: ResolveSecretValueOptions = {}
): Promise<string | undefined> {
  const envValue = readEnvValue(options.env, options.envKey);
  if (envValue !== undefined) {
    return envValue;
  }

  const secretValue = await store.get(key);
  return secretValue === undefined ? options.defaultValue : secretValue;
}
