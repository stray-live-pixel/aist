import { type JsonValue } from '../../core/shared/types/types';

export function formatJsonValueForText(value: JsonValue): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}
