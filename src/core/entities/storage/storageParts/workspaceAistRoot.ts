import path from 'node:path';

import { AIST_AGENT_DIR } from './AIST_AGENT_DIR';
import { normalizeRootPath } from './normalizeRootPath';

export function workspaceAistRoot(workspaceRoot: string): string {
  return path.join(normalizeRootPath(workspaceRoot, 'workspace root'), AIST_AGENT_DIR);
}
