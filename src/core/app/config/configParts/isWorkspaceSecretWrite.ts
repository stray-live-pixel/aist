import { type JsonValue } from '../../../shared/types/types';
import { getJsonPath } from './getJsonPath';
import { isJsonObject } from './isJsonObject';

export function isWorkspaceSecretWrite(key: string, value: JsonValue, secretKeys: Set<string>): boolean {
  if (secretKeys.has(key)) {
    return true;
  }

  for (const secretKey of secretKeys) {
    const prefix = `${key}.`;
    if (secretKey.startsWith(prefix) && isJsonObject(value)) {
      const nestedSecretValue = getJsonPath(value, secretKey.slice(prefix.length));
      if (nestedSecretValue !== undefined) {
        return true;
      }
    }
  }

  return false;
}
