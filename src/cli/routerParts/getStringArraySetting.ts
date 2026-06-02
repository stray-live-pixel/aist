import { FileBackedConfigStore } from '../../core/app/config/config';
import { getFirstConfigSetting } from './getFirstConfigSetting';

export async function getStringArraySetting(
  configStore: FileBackedConfigStore,
  keys: readonly string[]
): Promise<readonly string[]> {
  const value = await getFirstConfigSetting(configStore, keys);
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
