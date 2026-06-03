import type { OpenRouterMessage } from '../../../shared/types/types';
import { appendJsonl } from '../../storage/storage';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import { getChatHistoryPath } from './getChatHistoryPath';
import { requireChat } from './requireChat';
import { requireChatMeta } from './requireChatMeta';
import { touchChatMeta } from './touchChatMeta';
import { upsertChatIndexSummary } from './upsertChatIndexSummary';

/**
 * Что это: добавление одного model-history сообщения.
 * Зачем нужно: runtime сохраняет компактную историю модели отдельно от UI-сообщений.
 * Какую продуктовую проблему решает: продолжение диалога использует корректный контекст модели после restart.
 */
export async function appendChatHistory({
  context,
  chatId,
  message
}: {
  context: ChatRepositoryContext;
  chatId: string;
  message: OpenRouterMessage;
}): Promise<void> {
  const meta = await requireChatMeta({ context, chatId });
  await appendJsonl(getChatHistoryPath({ context, chatId: meta.id }), message);
  await touchChatMeta({ context, meta });
  const updatedChat = await requireChat({ context, chatId: meta.id });
  await upsertChatIndexSummary({ context, chat: updatedChat });
}
