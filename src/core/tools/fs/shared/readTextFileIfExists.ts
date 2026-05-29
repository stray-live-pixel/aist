import fs from 'node:fs';

import { isNotFoundError } from './isNotFoundError';

/**
 * Читает UTF-8 файл, если он существует.
 *
 * Утилита нужна preview/approval-сценариям: для нового файла старого содержимого
 * может не быть, и это нормальный продуктовый случай, а не ошибка. Все остальные
 * ошибки чтения пробрасываются выше, чтобы не скрывать проблемы доступа или I/O.
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
