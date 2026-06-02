import path from 'node:path';

import { getWorkspaceFolder } from '../../../shared/workspace';

export function getWorkspaceConfigPath(): string {
  return path.join(getWorkspaceFolder().uri.fsPath, '.aist-agent', 'settings.json');
}
