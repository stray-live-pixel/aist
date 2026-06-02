import fs from 'node:fs';
import path from 'node:path';

export function exists(workspacePath: string, relativePath: string): boolean {
  return fs.existsSync(path.join(workspacePath, relativePath));
}
