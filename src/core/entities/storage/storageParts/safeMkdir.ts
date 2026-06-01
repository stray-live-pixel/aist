import fs from 'node:fs';
import path from 'node:path';

import { StorageError } from './StorageError';
import { normalizeStoragePath } from './normalizeStoragePath';

export async function safeMkdir(directoryPath: string): Promise<void> {
  const normalizedPath = normalizeStoragePath(directoryPath, 'directory path');

  try {
    await fs.promises.mkdir(normalizedPath, { recursive: true });
  } catch (cause) {
    throw new StorageError('storage.mkdirFailed', `Failed to create storage directory: ${normalizedPath}`, {
      filePath: normalizedPath,
      cause
    });
  }
}
