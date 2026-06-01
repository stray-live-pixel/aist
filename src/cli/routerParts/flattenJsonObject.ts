import { type JsonObject } from '../../core/shared/types/types';
import { formatJsonValueForText } from './formatJsonValueForText';
import { isJsonObject } from './isJsonObject';

export function flattenJsonObject(value: JsonObject, prefix = ''): string[] {
  const lines: string[] = [];

  for (const [key, childValue] of Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) {
    if (childValue === undefined) {
      continue;
    }

    const pathKey = prefix ? `${prefix}.${key}` : key;
    if (isJsonObject(childValue) && Object.keys(childValue).length > 0) {
      lines.push(...flattenJsonObject(childValue, pathKey));
    } else {
      lines.push(`${pathKey}: ${formatJsonValueForText(childValue)}`);
    }
  }

  return lines;
}
