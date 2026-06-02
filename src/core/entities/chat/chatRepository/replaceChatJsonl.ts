import fs from 'node:fs';
import path from 'node:path';

import type { ChatRepositoryContext } from './ChatRepositoryContext';
import { getChatPath } from './getChatPath';

/**
 * Что это: atomic-перезапись JSONL-файла чата.
 * Зачем нужно: runtime иногда обновляет tool status, clear или compacted history целиком.
 * Какую продуктовую проблему решает: пользователь не получает полуперезаписанную историю после сбоя записи.
 */
export async function replaceChatJsonl({
  context,
  chatId,
  fileName,
  entries
}: {
  context: ChatRepositoryContext;
  chatId: string;
  fileName: 'messages.jsonl' | 'history.jsonl';
  entries: unknown[];
}): Promise<void> {
  const targetPath = path.join(getChatPath({ context, chatId }), fileName);
  const tempPath = path.join(
    path.dirname(targetPath),
    `.${fileName}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`
  );
  const content = entries.length ? `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n` : '';

  try {
    await fs.promises.writeFile(tempPath, content, 'utf8');
    await fs.promises.rename(tempPath, targetPath);
  } catch (error) {
    await fs.promises.rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
}
