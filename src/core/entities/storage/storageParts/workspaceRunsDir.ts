import { globalWorkspaceRunsDir } from './globalWorkspaceRunsDir';

export function workspaceRunsDir(workspaceRoot: string): string {
  return globalWorkspaceRunsDir(workspaceRoot);
}
