import fs from 'node:fs';

import { isNotFoundError } from '../shared/isNotFoundError';

/**
 * Читает прошлое UTF-8 содержимое файла, если файл уже существует.
 *
 * Для write_file это нужно только для честного расчёта диапазона изменений.
 * Отсутствующий файл не является ошибкой, потому что инструмент умеет создавать
 * новые файлы; любые другие ошибки файловой системы пробрасываем наверх.
 */
export async function readTextFileIfExists({ filePath }: { filePath: string }): Promise<string | undefined> {
  try {
    return await fs.promises.readFile(filePath, 'utf8');
  } catch (error) {
    if (isNotFoundError({ error })) {
      return undefined;
    }

    throw error;
  }
}
