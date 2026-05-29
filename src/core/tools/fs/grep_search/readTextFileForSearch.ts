import fs from 'node:fs';

const MAX_SEARCH_FILE_BYTES = 1024 * 1024;

/**
 * Читает файл для grep_search только если он безопасен для текстового поиска.
 *
 * Файлы больше 1 МБ и binary-файлы с null byte пропускаются без ошибки. Это
 * сохраняет прежнее поведение: поиск остаётся быстрым и не засоряет результаты
 * нечитаемыми данными.
 */
export async function readTextFileForSearch({ filePath }: { filePath: string }): Promise<string | undefined> {
  const stat = await fs.promises.stat(filePath);
  if (stat.size > MAX_SEARCH_FILE_BYTES) {
    return undefined;
  }

  const bytes = await fs.promises.readFile(filePath);
  if (bytes.some((byte) => byte === 0)) {
    return undefined;
  }

  return bytes.toString('utf8');
}
