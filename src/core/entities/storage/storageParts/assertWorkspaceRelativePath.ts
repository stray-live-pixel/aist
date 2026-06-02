import path from 'node:path';

import { StorageError } from './StorageError';
import { isAbsoluteOrDrivePath } from './isAbsoluteOrDrivePath';

export function assertWorkspaceRelativePath(relativePath: string): string {
  if (typeof relativePath !== 'string' || relativePath.trim() === '') {
    throw new StorageError('storage.invalidPath', 'Workspace-relative path must be a non-empty string.', {
      inputPath: String(relativePath)
    });
  }

  if (relativePath.includes('\0')) {
    throw new StorageError('storage.invalidPath', 'Workspace-relative path contains a null byte.', {
      inputPath: relativePath
    });
  }

  if (isAbsoluteOrDrivePath(relativePath)) {
    throw new StorageError('storage.pathTraversal', 'Workspace-relative path must not be absolute.', {
      inputPath: relativePath
    });
  }

  const segments = relativePath.split(/[\\/]+/);
  if (segments.some((segment) => segment === '..')) {
    throw new StorageError('storage.pathTraversal', 'Workspace-relative path must not contain parent segments.', {
      inputPath: relativePath
    });
  }

  return path.normalize(relativePath);
}
