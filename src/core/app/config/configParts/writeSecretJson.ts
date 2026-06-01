import { writeJsonAtomic } from '../../../entities/storage/storage';
import { type JsonObject } from '../../../shared/types/types';
import { ConfigStoreError } from './ConfigStoreError';

export async function writeSecretJson(filePath: string, secrets: JsonObject, key: string): Promise<void> {
  try {
    await writeJsonAtomic(filePath, secrets);
  } catch (cause) {
    throw new ConfigStoreError('secret.writeFailed', `Failed to write secret file: ${filePath}`, {
      key,
      filePath,
      cause
    });
  }
}
