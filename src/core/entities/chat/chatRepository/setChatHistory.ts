import type { OpenRouterMessage } from '../../../shared/types/types';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import { rebuildChatIndex } from './rebuildChatIndex';
import { replaceChatJsonl } from './replaceChatJsonl';
import { requireChatMeta } from './requireChatMeta';
import { touchChatMeta } from './touchChatMeta';

/**
 * Что это: полная замена model-history чата.
 * Зачем нужно: context compaction переписывает историю модели до компактного состояния.
 * Какую продуктовую проблему решает: агент продолжает диалог в пределах контекста без потери видимых сообщений.
 */
export async function setChatHistory({
  context,
  chatId,
  history
}: {
  context: ChatRepositoryContext;
  chatId: string;
  history: OpenRouterMessage[];
}): Promise<void> {
  const meta = await requireChatMeta({ context, chatId });
  await replaceChatJsonl({ context, chatId: meta.id, fileName: 'history.jsonl', entries: history });
  await touchChatMeta({ context, meta });
  await rebuildChatIndex({ context });
}
