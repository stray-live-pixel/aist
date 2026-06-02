import { writeJsonAtomic } from '../../../entities/storage/storage';
import { type JsonObject } from '../../../shared/types/types';
import { ConfigScope } from './ConfigScope';
import { ConfigStoreError } from './ConfigStoreError';

export async function writeConfigJson(
  filePath: string,
  settings: JsonObject,
  key: string,
  scope: ConfigScope
): Promise<void> {
  try {
    await writeJsonAtomic(filePath, settings);
  } catch (cause) {
    throw new ConfigStoreError('config.writeFailed', `Failed to write config file: ${filePath}`, {
      key,
      filePath,
      scope,
      cause
    });
  }
}
