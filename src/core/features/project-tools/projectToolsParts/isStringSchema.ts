import { isRecord } from './isRecord';

export function isStringSchema(value: unknown): boolean {
  return isRecord(value) && value.type === 'string';
}
