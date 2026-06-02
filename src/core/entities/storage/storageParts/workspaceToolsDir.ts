import path from 'node:path';

import { workspaceAistRoot } from './workspaceAistRoot';

export function workspaceToolsDir(workspaceRoot: string): string {
  return path.join(workspaceAistRoot(workspaceRoot), 'tools');
}
