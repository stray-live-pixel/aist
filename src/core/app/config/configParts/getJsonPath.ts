import { type JsonObject, type JsonValue } from '../../../shared/types/types';
import { isJsonObject } from './isJsonObject';

export function getJsonPath(settings: JsonObject, key: string): JsonValue | undefined {
  if (Object.prototype.hasOwnProperty.call(settings, key)) {
    return settings[key];
  }

  const segments = key.split('.');
  let current: JsonValue | undefined = settings;

  for (const segment of segments) {
    if (!isJsonObject(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}
