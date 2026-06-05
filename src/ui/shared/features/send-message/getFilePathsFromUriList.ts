import type { ComposerDropDataTransfer } from './dropTypes';
import { fileUriToPath } from './fileUriToPath';
import { hasDataTransferType } from './hasDataTransferType';

const URI_LIST_TYPE = 'text/uri-list';

/**
 * Что это: читает стандартный text/uri-list и превращает file:// URI в локальные пути.
 * Зачем нужно: VS Code часто передаёт drag payload именно как список URI, включая папки проекта.
 */
export function getFilePathsFromUriList({ dataTransfer }: { dataTransfer: ComposerDropDataTransfer }): string[] {
  if (!hasDataTransferType({ dataTransfer, type: URI_LIST_TYPE })) {
    return [];
  }

  return dataTransfer
    .getData(URI_LIST_TYPE)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((uri) => fileUriToPath({ uri }))
    .filter((path): path is string => Boolean(path));
}
