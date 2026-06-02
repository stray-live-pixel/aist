import { asRecord, asString } from '../../tool-value';
import { type FileReference } from '../types';

export function fileFromPathValue(value: unknown): FileReference | undefined {
  const item = asRecord(value);
  const filePath = asString(item?.path);
  return filePath ? { path: filePath, label: asString(item?.type) } : undefined;
}
