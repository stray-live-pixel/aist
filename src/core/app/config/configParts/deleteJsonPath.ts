import { type JsonObject, type JsonValue } from '../../../shared/types/types';
import { isJsonObject } from './isJsonObject';

export function deleteJsonPath(settings: JsonObject, key: string): void {
  if (Object.prototype.hasOwnProperty.call(settings, key)) {
    delete settings[key];
    return;
  }

  const segments = key.split('.');
  const finalSegment = segments.pop()!;
  let current: JsonValue | undefined = settings;

  for (const segment of segments) {
    if (!isJsonObject(current)) {
      return;
    }

    current = current[segment];
  }

  if (isJsonObject(current)) {
    delete current[finalSegment];
  }
}
