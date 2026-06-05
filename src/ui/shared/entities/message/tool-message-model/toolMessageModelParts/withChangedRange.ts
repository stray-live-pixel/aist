import { type ChatMessage } from '../../../../types';
import { getToolResult } from '../../tool-value';
import { type FileReference } from '../types';

export function withChangedRange(file: FileReference, message: ChatMessage): FileReference {
  const result = getToolResult(message);
  const line = typeof result?.changedStartLine === 'number' ? result.changedStartLine : undefined;
  const endLine = typeof result?.changedEndLine === 'number' ? result.changedEndLine : undefined;
  if (!line) return file;

  return {
    ...file,
    line,
    column: typeof result?.changedStartColumn === 'number' ? result.changedStartColumn : 1,
    endLine,
    endColumn: typeof result?.changedEndColumn === 'number' ? result.changedEndColumn : undefined,
    label: endLine && endLine !== line ? `changed lines ${line}-${endLine}` : `changed line ${line}`
  };
}
