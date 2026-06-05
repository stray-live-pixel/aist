import { type ChatMessage } from '../../../../types';
import { arrayValue, getToolResult } from '../../tool-value';
import { type FileReference } from '../types';
import { fileFromChangedFile } from './fileFromChangedFile';
import { fileFromPathValue } from './fileFromPathValue';
import { fileFromSearchMatch } from './fileFromSearchMatch';

export function getResultFileReferences(message: ChatMessage): FileReference[] {
  const result = getToolResult(message);
  const entries = arrayValue(result?.entries);
  const matches = arrayValue(result?.matches);
  const changedFiles = arrayValue(result?.changedFiles);
  const files = arrayValue(result?.files);

  return [
    ...entries.map(fileFromPathValue),
    ...matches.map(fileFromSearchMatch),
    ...changedFiles.map(fileFromChangedFile),
    ...files.map(fileFromChangedFile)
  ].filter(Boolean) as FileReference[];
}
