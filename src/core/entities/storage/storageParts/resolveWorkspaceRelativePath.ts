import path from 'node:path';

import { StorageError } from './StorageError';
import { assertWorkspaceRelativePath } from './assertWorkspaceRelativePath';
import { isPathInsideOrSame } from './isPathInsideOrSame';
import { normalizeRootPath } from './normalizeRootPath';

export function resolveWorkspaceRelativePath(workspaceRoot: string, relativePath: string): string {
  const rootPath = normalizeRootPath(workspaceRoot, 'workspace root');
  const safeRelativePath = assertWorkspaceRelativePath(relativePath);
  const resolvedPath = path.resolve(rootPath, safeRelativePath);

  if (!isPathInsideOrSame(rootPath, resolvedPath)) {
    throw new StorageError('storage.pathTraversal', 'Workspace-relative path escapes the workspace root.', {
      rootPath,
      inputPath: relativePath,
      filePath: resolvedPath
    });
  }

  return resolvedPath;
}
