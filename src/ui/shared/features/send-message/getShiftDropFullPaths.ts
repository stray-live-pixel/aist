import type { ComposerDropDataTransfer } from './dropTypes';
import { getFilePathsFromFileList } from './getFilePathsFromFileList';
import { getFilePathsFromPlainText } from './getFilePathsFromPlainText';
import { getFilePathsFromUriList } from './getFilePathsFromUriList';
import { uniqueNonEmptyPaths } from './uniqueNonEmptyPaths';

/**
 * Что это: достаёт fullpath файлов и папок из Shift-drop payload.
 * Зачем нужно: VS Code отдаёт перетаскиваемые элементы как file:// URI или локальные File.path, а Composer должен вставлять именно полный путь.
 */
export function getShiftDropFullPaths({
  dataTransfer,
  shiftKey
}: {
  dataTransfer: ComposerDropDataTransfer;
  shiftKey: boolean;
}): string[] {
  if (!shiftKey) {
    return [];
  }

  const paths = [
    ...getFilePathsFromFileList({ dataTransfer }),
    ...getFilePathsFromUriList({ dataTransfer }),
    ...getFilePathsFromPlainText({ dataTransfer })
  ];

  return uniqueNonEmptyPaths({ paths });
}
