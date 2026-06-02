import { ConfigStoreError } from './ConfigStoreError';
import { isValidStoreKey } from './isValidStoreKey';

export function assertSecretKey(key: string): void {
  if (!isValidStoreKey(key)) {
    throw new ConfigStoreError('secret.invalidKey', 'Secret key must be a non-empty dot-separated path.', { key });
  }
}
