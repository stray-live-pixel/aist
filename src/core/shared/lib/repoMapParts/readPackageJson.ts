import fs from 'node:fs';
import path from 'node:path';

export function readPackageJson(workspacePath: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(fs.readFileSync(path.join(workspacePath, 'package.json'), 'utf8')) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}
