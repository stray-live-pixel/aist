import type { OpenRouterMessage } from '../../../shared/types/types';
import { appendJsonl } from '../../storage/storage';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import { getChatHistoryPath } from './getChatHistoryPath';
import { rebuildChatIndex } from './rebuildChatIndex';
import { requireChatMeta } from './requireChatMeta';
import { touchChatMeta } from './touchChatMeta';

/**
 * Что это: append-пакет model-history сообщений.
 * Зачем нужно: runtime может сохранять несколько сообщений модели одним сценарием.
 * Какую продуктовую проблему решает: продолжение чата получает полный контекст без лишних публичных вызовов.
 */
export async function appendChatHistoryBatch({
  context,
  chatId,
  messages
}: {
  context: ChatRepositoryContext;
  chatId: string;
  messages: OpenRouterMessage[];
}): Promise<void> {
  const meta = await requireChatMeta({ context, chatId });

  for (const message of messages) {
    await appendJsonl(getChatHistoryPath({ context, chatId: meta.id }), message);
  }

  await touchChatMeta({ context, meta });
  await rebuildChatIndex({ context });
}
