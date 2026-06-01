import { type JsonValue } from '../../../shared/types/types';
import { ConfigStore } from './ConfigStore';
import { ResolveConfigValueOptions } from './ResolveConfigValueOptions';
import { readEnvValue } from './readEnvValue';

export async function resolveConfigValue<T extends JsonValue>(
  store: ConfigStore,
  key: string,
  options: ResolveConfigValueOptions<T> = {}
): Promise<T | undefined> {
  const envValue = readEnvValue(options.env, options.envKey);
  if (envValue !== undefined) {
    return options.parseEnv ? options.parseEnv(envValue) : (envValue as T);
  }

  const configValue = await store.get<T>(key);
  return configValue === undefined ? options.defaultValue : configValue;
}
