import path from 'node:path';

import { globalWorkspaceRoot } from './globalWorkspaceRoot';

export function globalWorkspaceChatsDir(workspaceRoot: string, homeDir?: string): string {
  return path.join(globalWorkspaceRoot(workspaceRoot, homeDir), 'chats');
}
