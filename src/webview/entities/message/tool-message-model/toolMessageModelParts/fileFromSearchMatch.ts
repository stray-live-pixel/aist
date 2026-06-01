import { asRecord, asString } from '../../tool-value';
import { type FileReference } from '../types';

export function fileFromSearchMatch(value: unknown): FileReference | undefined {
  const item = asRecord(value);
  const filePath = asString(item?.path);
  if (!filePath) return undefined;

  return {
    path: filePath,
    line: typeof item?.line === 'number' ? item.line : undefined,
    column: typeof item?.column === 'number' ? item.column : undefined
  };
}
