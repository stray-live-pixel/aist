import path from 'node:path';

import { globalAistRoot } from './globalAistRoot';

export function globalSettingsFile(homeDir?: string): string {
  return path.join(globalAistRoot(homeDir), 'settings.json');
}
