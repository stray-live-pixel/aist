import path from 'node:path';

import { StorageError } from './StorageError';
import { assertWorkspaceRelativePath } from './assertWorkspaceRelativePath';
import { isPathInsideOrSame } from './isPathInsideOrSame';
import { workspaceAistRoot } from './workspaceAistRoot';

export function resolveWorkspaceAistPath(workspaceRoot: string, relativePath: string): string {
  const rootPath = workspaceAistRoot(workspaceRoot);
  const safeRelativePath = assertWorkspaceRelativePath(relativePath);
  const resolvedPath = path.resolve(rootPath, safeRelativePath);

  if (!isPathInsideOrSame(rootPath, resolvedPath)) {
    throw new StorageError('storage.pathTraversal', 'Workspace storage path escapes the .aist-agent root.', {
      rootPath,
      inputPath: relativePath,
      filePath: resolvedPath
    });
  }

  return resolvedPath;
}
