import path from 'node:path';

import { workspaceAistRoot } from './workspaceAistRoot';

export function workspaceMemoryFile(workspaceRoot: string): string {
  return path.join(workspaceAistRoot(workspaceRoot), 'memory.json');
}
