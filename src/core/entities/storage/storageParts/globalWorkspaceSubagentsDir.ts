import path from 'node:path';

import { globalWorkspaceRoot } from './globalWorkspaceRoot';

export function globalWorkspaceSubagentsDir(workspaceRoot: string, homeDir?: string): string {
  return path.join(globalWorkspaceRoot(workspaceRoot, homeDir), 'subagents');
}
