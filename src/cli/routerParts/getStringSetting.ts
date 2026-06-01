import { FileBackedConfigStore } from '../../core/app/config/config';
import { getFirstConfigSetting } from './getFirstConfigSetting';

export async function getStringSetting(
  configStore: FileBackedConfigStore,
  keys: readonly string[]
): Promise<string | undefined> {
  const value = await getFirstConfigSetting(configStore, keys);
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
