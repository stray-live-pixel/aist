import { MAX_FULL_MODEL_RESULT_CHARS } from './MAX_FULL_MODEL_RESULT_CHARS';

export function isLargeSerialized(value: Record<string, unknown>): boolean {
  return JSON.stringify(value).length > MAX_FULL_MODEL_RESULT_CHARS;
}
