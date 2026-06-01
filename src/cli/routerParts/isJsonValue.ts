import { type JsonValue } from '../../core/shared/types/types';
import { isJsonObject } from './isJsonObject';

export function isJsonValue(value: unknown): value is JsonValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    (Array.isArray(value) && value.every(isJsonValue)) ||
    (isJsonObject(value) && Object.values(value).every((child) => child === undefined || isJsonValue(child)))
  );
}
