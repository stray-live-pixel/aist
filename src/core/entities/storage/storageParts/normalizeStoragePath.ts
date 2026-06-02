import path from 'node:path';

import { StorageError } from './StorageError';

export function normalizeStoragePath(filePath: string, label: string): string {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    throw new StorageError('storage.invalidPath', `${label} must be a non-empty string.`, {
      inputPath: String(filePath)
    });
  }

  if (filePath.includes('\0')) {
    throw new StorageError('storage.invalidPath', `${label} contains a null byte.`, {
      inputPath: filePath
    });
  }

  return path.resolve(filePath);
}
