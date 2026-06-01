import os from 'node:os';
import path from 'node:path';

export function getGlobalConfigPath(): string {
  return path.join(os.homedir(), '.aist-agent', 'settings.json');
}
