import path from 'node:path';

import { encodeWorkspaceStorageKey } from './encodeWorkspaceStorageKey';
import { globalAistRoot } from './globalAistRoot';
import { normalizeRootPath } from './normalizeRootPath';

export function globalWorkspaceRoot(workspaceRoot: string, homeDir?: string): string {
  const workspacePath = normalizeRootPath(workspaceRoot, 'workspace root');
  return path.join(globalAistRoot(homeDir), 'workspaces', encodeWorkspaceStorageKey(workspacePath));
}
