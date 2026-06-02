import { globalWorkspaceChatsDir } from './globalWorkspaceChatsDir';

export function workspaceChatsDir(workspaceRoot: string): string {
  return globalWorkspaceChatsDir(workspaceRoot);
}
