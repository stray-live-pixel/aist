import { FileBackedConfigStore } from '../../core/app/config/config';
import { type JsonValue } from '../../core/shared/types/types';

export async function getFirstConfigSetting(
  configStore: FileBackedConfigStore,
  keys: readonly string[]
): Promise<JsonValue | undefined> {
  for (const key of keys) {
    const value = await configStore.get<JsonValue>(key);
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}
