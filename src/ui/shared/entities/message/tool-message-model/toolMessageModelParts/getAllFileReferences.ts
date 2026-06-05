import { type ChatMessage } from '../../../../types';
import { type FileReference } from '../types';
import { getResultFileReferences } from './getResultFileReferences';

export function getAllFileReferences(message: ChatMessage, primaryFile?: FileReference): FileReference[] {
  return [primaryFile, ...getResultFileReferences(message)].filter(Boolean) as FileReference[];
}
