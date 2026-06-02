import crypto from 'node:crypto';

export function createDigest(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
