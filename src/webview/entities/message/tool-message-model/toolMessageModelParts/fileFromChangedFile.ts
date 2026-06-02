import { asRecord, asString } from '../../tool-value';
import { type FileReference } from '../types';

export function fileFromChangedFile(value: unknown): FileReference | undefined {
  const item = asRecord(value);
  const filePath = asString(item?.path);
  if (!filePath) return undefined;

  const line = typeof item?.changedStartLine === 'number' ? item.changedStartLine : undefined;
  const endLine = typeof item?.changedEndLine === 'number' ? item.changedEndLine : undefined;

  return {
    path: filePath,
    line,
    column: typeof item?.changedStartColumn === 'number' ? item.changedStartColumn : undefined,
    endLine,
    endColumn: typeof item?.changedEndColumn === 'number' ? item.changedEndColumn : undefined,
    label: line && endLine && endLine !== line ? `changed lines ${line}-${endLine}` : undefined
  };
}
