import path from 'node:path';

import { globalAistRoot } from './globalAistRoot';

export function globalSecretsFile(homeDir?: string): string {
  return path.join(globalAistRoot(homeDir), 'secrets.json');
}
