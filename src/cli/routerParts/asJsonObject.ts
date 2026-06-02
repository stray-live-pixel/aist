import { type JsonObject, type JsonValue } from '../../core/shared/types/types';
import { isJsonObject } from './isJsonObject';

export function asJsonObject(value: JsonValue | undefined): JsonObject {
  return isJsonObject(value) ? value : {};
}
