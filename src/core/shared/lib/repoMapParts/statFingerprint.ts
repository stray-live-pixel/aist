import { createHash } from 'node:crypto';
import fs from 'node:fs';

import { CACHE_DIGEST_LIMIT_BYTES } from './CACHE_DIGEST_LIMIT_BYTES';

export function statFingerprint(filePath: string, includeDigest: boolean): string {
  try {
    const stat = fs.statSync(filePath);
    const base = `${stat.isDirectory() ? 'd' : 'f'}:${stat.size}:${Math.trunc(stat.mtimeMs)}`;

    if (!includeDigest || !stat.isFile() || stat.size > CACHE_DIGEST_LIMIT_BYTES) {
      return base;
    }

    return `${base}:${createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')}`;
  } catch {
    return 'missing';
  }
}
