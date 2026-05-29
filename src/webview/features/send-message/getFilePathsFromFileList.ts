import type { ComposerDropDataTransfer } from './dropTypes';

/**
 * Что это: читает Electron/VS Code File.path, если webview получил настоящие file objects.
 * Зачем нужно: это самый точный источник fullpath для локального файла или папки.
 */
export function getFilePathsFromFileList({ dataTransfer }: { dataTransfer: ComposerDropDataTransfer }): string[] {
  const files = Array.from(dataTransfer.files ?? []);

  return files.map((file) => file.path).filter((path): path is string => Boolean(path));
}
