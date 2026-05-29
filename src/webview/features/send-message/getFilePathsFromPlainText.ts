import type { ComposerDropDataTransfer } from './dropTypes';
import { fileUriToPath } from './fileUriToPath';
import { hasDataTransferType } from './hasDataTransferType';

const PLAIN_TEXT_TYPE = 'text/plain';

/**
 * Что это: fallback для VS Code, когда доступен только plain text с file:// URI или уже готовым fullpath.
 * Зачем нужно: разные версии VS Code/Electron могут отдавать drag данные немного по-разному.
 */
export function getFilePathsFromPlainText({ dataTransfer }: { dataTransfer: ComposerDropDataTransfer }): string[] {
  if (!hasDataTransferType({ dataTransfer, type: PLAIN_TEXT_TYPE })) {
    return [];
  }

  return dataTransfer
    .getData(PLAIN_TEXT_TYPE)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((value) => (value.startsWith('file://') ? fileUriToPath({ uri: value }) : value))
    .filter((path): path is string => Boolean(path));
}
