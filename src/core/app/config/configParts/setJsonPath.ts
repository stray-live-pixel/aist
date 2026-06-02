import { type JsonObject, type JsonValue } from '../../../shared/types/types';
import { isJsonObject } from './isJsonObject';

export function setJsonPath(settings: JsonObject, key: string, value: JsonValue): void {
  const segments = key.split('.');
  const finalSegment = segments.pop()!;
  let current = settings;

  for (const segment of segments) {
    const next = current[segment];
    if (!isJsonObject(next)) {
      current[segment] = {};
    }
    current = current[segment] as JsonObject;
  }

  current[finalSegment] = value;
}
