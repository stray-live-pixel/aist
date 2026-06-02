import { type JsonObject } from '../../core/shared/types/types';
import { isJsonObject } from './isJsonObject';

export function mergeJsonObjects(base: JsonObject, override: JsonObject): JsonObject {
  const result: JsonObject = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const current = result[key];
    if (isJsonObject(current) && isJsonObject(value)) {
      result[key] = mergeJsonObjects(current, value);
    } else {
      result[key] = value;
    }
  }

  return result;
}
