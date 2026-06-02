import path from 'node:path';

import type { ChatRepositoryContext } from './ChatRepositoryContext';
import { getChatPath } from './getChatPath';

/**
 * Что это: путь к history.jsonl конкретного чата.
 * Зачем нужно: модельная история хранится отдельно от UI-сообщений.
 * Какую продуктовую проблему решает: context compaction может менять model history без потери видимого чата.
 */
export function getChatHistoryPath({ context, chatId }: { context: ChatRepositoryContext; chatId: string }): string {
  return path.join(getChatPath({ context, chatId }), 'history.jsonl');
}
