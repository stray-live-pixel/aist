import fs from 'node:fs';

import { MAX_EXCERPT_ITEMS } from './MAX_EXCERPT_ITEMS';
import { isUsefulTopLevelDir } from './isUsefulTopLevelDir';

export function getTopLevelDirs(workspacePath: string): string[] {
  try {
    return fs
      .readdirSync(workspacePath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter(isUsefulTopLevelDir)
      .sort((left, right) => left.localeCompare(right))
      .slice(0, MAX_EXCERPT_ITEMS);
  } catch {
    return [];
  }
}
