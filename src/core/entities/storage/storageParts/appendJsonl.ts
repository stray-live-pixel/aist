import fs from 'node:fs';
import path from 'node:path';

import { StorageError } from './StorageError';
import { normalizeStoragePath } from './normalizeStoragePath';
import { safeMkdir } from './safeMkdir';
import { serializeJson } from './serializeJson';

export async function appendJsonl(targetPath: string, value: unknown): Promise<void> {
  const normalizedTargetPath = normalizeStoragePath(targetPath, 'target path');
  const directoryPath = path.dirname(normalizedTargetPath);
  const serialized = serializeJson(value);

  await safeMkdir(directoryPath);

  try {
    await fs.promises.appendFile(normalizedTargetPath, `${serialized}\n`, 'utf8');
  } catch (cause) {
    throw new StorageError('storage.appendFailed', `Failed to append JSONL file: ${normalizedTargetPath}`, {
      filePath: normalizedTargetPath,
      cause
    });
  }
}
