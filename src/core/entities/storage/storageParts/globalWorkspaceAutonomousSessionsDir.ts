import path from 'node:path';

import { globalWorkspaceRoot } from './globalWorkspaceRoot';

export function globalWorkspaceAutonomousSessionsDir(workspaceRoot: string, homeDir?: string): string {
  return path.join(globalWorkspaceRoot(workspaceRoot, homeDir), 'autonomous', 'sessions');
}
