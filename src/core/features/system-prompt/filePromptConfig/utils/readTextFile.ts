import fs from 'node:fs';

/**
 * Что это: читает небольшой текстовый файл инструкции и возвращает очищенный текст.
 * Зачем нужно: пустые или недоступные файлы не должны создавать пустые секции в system prompt.
 */
export function readTextFile(params: { filePath: string }): string | undefined {
  try {
    if (!fs.existsSync(params.filePath)) return undefined;

    return fs.readFileSync(params.filePath, 'utf8').trim() || undefined;
  } catch {
    return undefined;
  }
}
