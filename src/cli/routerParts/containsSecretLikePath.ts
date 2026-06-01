import { type JsonValue } from '../../core/shared/types/types';
import { isJsonObject } from './isJsonObject';
import { isSecretLikeConfigPath } from './isSecretLikeConfigPath';

export function containsSecretLikePath(key: string, value: JsonValue): boolean {
  if (isSecretLikeConfigPath(key)) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsSecretLikePath(key, item));
  }

  if (isJsonObject(value)) {
    return Object.entries(value).some(([childKey, childValue]) =>
      childValue === undefined ? false : containsSecretLikePath(`${key}.${childKey}`, childValue)
    );
  }

  return false;
}
