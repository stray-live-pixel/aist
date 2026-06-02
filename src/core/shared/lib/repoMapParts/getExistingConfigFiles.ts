import fs from 'node:fs';
import path from 'node:path';

import { CONFIG_FILE_CANDIDATES } from './CONFIG_FILE_CANDIDATES';

export function getExistingConfigFiles(workspacePath: string): string[] {
  return CONFIG_FILE_CANDIDATES.filter((relativePath) => {
    try {
      return fs.statSync(path.join(workspacePath, relativePath)).isFile();
    } catch {
      return false;
    }
  });
}
