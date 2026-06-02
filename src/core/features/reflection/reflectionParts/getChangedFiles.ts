import { type ChatMessage } from '../../../shared/types/types';
import { MAX_FIELD_CHARS } from './MAX_FIELD_CHARS';
import { asRecord } from './asRecord';
import { truncateForReflection } from './truncateForReflection';

export function getChangedFiles(message: ChatMessage): string[] {
  const args = message.args || {};
  if (typeof args.path === 'string' && ['write_file', 'replace_in_file', 'delete_path'].includes(message.name || '')) {
    return [truncateForReflection(args.path, MAX_FIELD_CHARS)];
  }

  const modelResult = message.modelResult || {};
  const result = asRecord(modelResult.result) || modelResult;
  const files = Array.isArray(result.files)
    ? result.files
    : Array.isArray(result.changedFiles)
      ? result.changedFiles
      : [];
  return files
    .map((file) => (asRecord(file)?.path ? String(asRecord(file)?.path) : ''))
    .filter(Boolean)
    .map((file) => truncateForReflection(file, MAX_FIELD_CHARS));
}
