import os from 'node:os';
import path from 'node:path';

import { AIST_AGENT_DIR } from './AIST_AGENT_DIR';
import { normalizeRootPath } from './normalizeRootPath';

export function globalAistRoot(homeDir: string = os.homedir()): string {
  return path.join(normalizeRootPath(homeDir, 'home directory'), AIST_AGENT_DIR);
}
