import path from 'node:path';

import { workspaceAistRoot } from './workspaceAistRoot';

export function workspaceSettingsFile(workspaceRoot: string): string {
  return path.join(workspaceAistRoot(workspaceRoot), 'settings.json');
}
