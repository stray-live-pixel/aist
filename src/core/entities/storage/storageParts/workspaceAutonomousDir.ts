import path from 'node:path';

import { workspaceAistRoot } from './workspaceAistRoot';

export function workspaceAutonomousDir(workspaceRoot: string): string {
  return path.join(workspaceAistRoot(workspaceRoot), 'autonomous');
}
