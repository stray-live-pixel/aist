import { type JsonValue } from '../../core/shared/types/types';
import { isJsonValue } from './isJsonValue';

export function parseConfigValue(rawValue: string): JsonValue {
  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (isJsonValue(parsed)) {
      return parsed;
    }
  } catch {
    return rawValue;
  }

  return rawValue;
}
