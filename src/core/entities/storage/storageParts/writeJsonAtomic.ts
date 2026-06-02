import fs from 'node:fs';
import path from 'node:path';

import { StorageError } from './StorageError';
import { WriteJsonAtomicOptions } from './WriteJsonAtomicOptions';
import { createTempPath } from './createTempPath';
import { normalizeStoragePath } from './normalizeStoragePath';
import { removeTempBestEffort } from './removeTempBestEffort';
import { safeMkdir } from './safeMkdir';
import { serializeJson } from './serializeJson';

export async function writeJsonAtomic(
  targetPath: string,
  value: unknown,
  options: WriteJsonAtomicOptions = {}
): Promise<void> {
  const normalizedTargetPath = normalizeStoragePath(targetPath, 'target path');
  const directoryPath = path.dirname(normalizedTargetPath);
  await safeMkdir(directoryPath);

  const tempPath = createTempPath(normalizedTargetPath);

  try {
    const serialized = serializeJson(value, options.spaces ?? 2);
    await fs.promises.writeFile(tempPath, `${serialized}\n`, 'utf8');
    await fs.promises.rename(tempPath, normalizedTargetPath);
  } catch (cause) {
    await removeTempBestEffort(tempPath);

    if (cause instanceof StorageError) {
      throw cause;
    }

    throw new StorageError('storage.writeFailed', `Failed to atomically write JSON file: ${normalizedTargetPath}`, {
      filePath: normalizedTargetPath,
      cause
    });
  }
}
