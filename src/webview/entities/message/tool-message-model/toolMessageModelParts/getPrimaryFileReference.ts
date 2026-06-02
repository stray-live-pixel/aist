import { type ChatMessage } from '../../../../shared/types';
import { asString, getToolPreview, getToolResult } from '../../tool-value';
import { type FileReference } from '../types';
import { withChangedRange } from './withChangedRange';

export function getPrimaryFileReference(message: ChatMessage): FileReference | undefined {
  const argPath = asString(message.args?.path);
  if (argPath) return withChangedRange({ path: argPath }, message);

  const resultPath = asString(getToolResult(message)?.path) || asString(getToolPreview(message)?.path);
  return resultPath ? withChangedRange({ path: resultPath }, message) : undefined;
}
