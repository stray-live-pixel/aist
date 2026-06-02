import path from 'node:path';

import { globalAistRoot } from './globalAistRoot';

export function globalMemoryFile(homeDir?: string): string {
  return path.join(globalAistRoot(homeDir), 'memory.json');
}
