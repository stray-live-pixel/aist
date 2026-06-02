import { MAX_BASH_STREAM_MODEL_CHARS } from './MAX_BASH_STREAM_MODEL_CHARS';
import { MAX_DIFF_MODEL_FILES } from './MAX_DIFF_MODEL_FILES';
import { MAX_GREP_MODEL_MATCHES } from './MAX_GREP_MODEL_MATCHES';
import { MAX_READ_FILE_MODEL_CONTENT_CHARS } from './MAX_READ_FILE_MODEL_CONTENT_CHARS';
import { isLargeSerialized } from './isLargeSerialized';
import { stringValue } from './stringValue';

export function shouldCompact(
  toolName: string,
  result: Record<string, unknown>,
  uiResult: Record<string, unknown>
): boolean {
  if (toolName === 'read_file') {
    return stringValue(result.content).length > MAX_READ_FILE_MODEL_CONTENT_CHARS || isLargeSerialized(result);
  }

  if (toolName === 'run_bash_script') {
    return (
      stringValue(result.stdout).length + stringValue(result.stderr).length > MAX_BASH_STREAM_MODEL_CHARS ||
      isLargeSerialized(result)
    );
  }

  if (toolName === 'grep_search') {
    const matches = Array.isArray(result.matches) ? result.matches : [];
    return matches.length > MAX_GREP_MODEL_MATCHES || isLargeSerialized(result);
  }

  if (['write_file', 'replace_in_file'].includes(toolName)) {
    const files = Array.isArray(result.files)
      ? result.files
      : Array.isArray(result.changedFiles)
        ? result.changedFiles
        : [];
    return files.length > MAX_DIFF_MODEL_FILES || isLargeSerialized(result) || isLargeSerialized(uiResult);
  }

  return isLargeSerialized(uiResult);
}
