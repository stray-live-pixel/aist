import path from 'node:path';

import { globalAistRoot } from './globalAistRoot';

export function globalToolsDir(homeDir?: string): string {
  return path.join(globalAistRoot(homeDir), 'tools');
}
