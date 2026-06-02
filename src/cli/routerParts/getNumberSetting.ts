import { FileBackedConfigStore } from '../../core/app/config/config';
import { getFirstConfigSetting } from './getFirstConfigSetting';

export async function getNumberSetting(
  configStore: FileBackedConfigStore,
  keys: readonly string[],
  fallback: number
): Promise<number> {
  const value = await getFirstConfigSetting(configStore, keys);
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}
