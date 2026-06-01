import path from 'node:path';

import type { ChatRepositoryContext } from './ChatRepositoryContext';
import { getChatPath } from './getChatPath';

/**
 * Что это: путь к messages.jsonl конкретного чата.
 * Зачем нужно: UI-сообщения всегда читаются и пишутся в одном месте.
 * Какую продуктовую проблему решает: история диалога не раздваивается между сценариями runtime.
 */
export function getChatMessagesPath({ context, chatId }: { context: ChatRepositoryContext; chatId: string }): string {
  return path.join(getChatPath({ context, chatId }), 'messages.jsonl');
}
