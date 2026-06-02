import { globalWorkspaceAutonomousSessionsDir } from './globalWorkspaceAutonomousSessionsDir';

export function workspaceAutonomousSessionsDir(workspaceRoot: string): string {
  return globalWorkspaceAutonomousSessionsDir(workspaceRoot);
}
