import path from 'node:path';

import type { ChatRepositoryContext } from './ChatRepositoryContext';
import { getChatPath } from './getChatPath';

/**
 * Что это: путь к meta.json конкретного чата.
 * Зачем нужно: все сценарии пишут метаданные в один и тот же файл.
 * Какую продуктовую проблему решает: у карточки чата нет конкурирующих источников правды.
 */
export function getChatMetaPath({ context, chatId }: { context: ChatRepositoryContext; chatId: string }): string {
  return path.join(getChatPath({ context, chatId }), 'meta.json');
}
