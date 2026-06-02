import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

export function getDaemonSocketPath(workspaceRoot: string): string {
  const normalizedWorkspaceRoot = path.resolve(workspaceRoot);

  if (process.platform === 'win32') {
    const hash = createHash('sha1').update(normalizedWorkspaceRoot).digest('hex').slice(0, 16);
    return `\\\\.\\pipe\\aist-daemon-${hash}`;
  }

  const hash = createHash('sha1').update(normalizedWorkspaceRoot).digest('hex').slice(0, 16);
  return path.join(os.tmpdir(), `aist-daemon-${hash}.sock`);
}
