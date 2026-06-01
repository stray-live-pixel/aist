import { ConfigStoreError } from './ConfigStoreError';
import { isValidStoreKey } from './isValidStoreKey';

export function assertConfigKey(key: string): void {
  if (!isValidStoreKey(key)) {
    throw new ConfigStoreError('config.invalidKey', 'Config key must be a non-empty dot-separated path.', { key });
  }
}
