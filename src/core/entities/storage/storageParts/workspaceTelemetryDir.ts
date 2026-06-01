import { globalWorkspaceTelemetryDir } from './globalWorkspaceTelemetryDir';

export function workspaceTelemetryDir(workspaceRoot: string): string {
  return globalWorkspaceTelemetryDir(workspaceRoot);
}
