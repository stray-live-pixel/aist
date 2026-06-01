import { type JsonObject, type JsonValue } from '../../core/shared/types/types';
import { REDACTED_VALUE } from './REDACTED_VALUE';
import { isJsonObject } from './isJsonObject';
import { isSecretLikeConfigPath } from './isSecretLikeConfigPath';

export function redactConfigValue(
  key: string,
  value: JsonValue | undefined
): { readonly value: JsonValue | undefined; readonly redacted: boolean } {
  if (value === undefined) {
    return { value, redacted: false };
  }

  if (isSecretLikeConfigPath(key)) {
    return { value: REDACTED_VALUE, redacted: true };
  }

  if (Array.isArray(value)) {
    let redacted = false;
    const items = value.map((item) => {
      const result = redactConfigValue(key, item);
      redacted = redacted || result.redacted;
      return result.value ?? null;
    });
    return { value: items, redacted };
  }

  if (isJsonObject(value)) {
    let redacted = false;
    const result: JsonObject = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      if (childValue === undefined) {
        continue;
      }

      const pathKey = key ? `${key}.${childKey}` : childKey;
      const child = redactConfigValue(pathKey, childValue);
      redacted = redacted || child.redacted;
      result[childKey] = child.value;
    }
    return { value: result, redacted };
  }

  return { value, redacted: false };
}
