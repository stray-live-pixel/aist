import path from 'node:path';

import { globalWorkspaceRoot } from './globalWorkspaceRoot';

export function globalWorkspaceTelemetryDir(workspaceRoot: string, homeDir?: string): string {
  return path.join(globalWorkspaceRoot(workspaceRoot, homeDir), 'telemetry');
}
