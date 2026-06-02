import path from 'node:path';

import { CONFIG_FILE_CANDIDATES } from './CONFIG_FILE_CANDIDATES';
import { statFingerprint } from './statFingerprint';

export function computeRepoMapFingerprint(workspacePath: string): string {
  const entries = ['root', statFingerprint(workspacePath, false)];

  for (const relativePath of CONFIG_FILE_CANDIDATES) {
    entries.push(relativePath, statFingerprint(path.join(workspacePath, relativePath), true));
  }

  return entries.join('|');
}
