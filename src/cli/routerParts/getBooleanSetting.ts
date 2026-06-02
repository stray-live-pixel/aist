import { FileBackedConfigStore } from '../../core/app/config/config';
import { getFirstConfigSetting } from './getFirstConfigSetting';

export async function getBooleanSetting(
  configStore: FileBackedConfigStore,
  keys: readonly string[],
  fallback: boolean
): Promise<boolean> {
  const value = await getFirstConfigSetting(configStore, keys);
  return typeof value === 'boolean' ? value : fallback;
}
