import { FileRepositoryError, readJsonlFile } from '../../../shared/lib/fileRepository';
import type { ChatMessage } from '../../../shared/types/types';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import { getChatMessagesPath } from './getChatMessagesPath';
import { rebuildChatIndex } from './rebuildChatIndex';
import { replaceChatJsonl } from './replaceChatJsonl';
import { requireChatMeta } from './requireChatMeta';
import { touchChatMeta } from './touchChatMeta';

/**
 * Что это: обновление уже записанного UI-сообщения.
 * Зачем нужно: tool/status updates меняют карточку сообщения без добавления дублей.
 * Какую продуктовую проблему решает: пользователь видит один актуальный tool-result вместо цепочки промежуточных записей.
 */
export async function updateChatMessage({
  context,
  chatId,
  messageId,
  patch
}: {
  context: ChatRepositoryContext;
  chatId: string;
  messageId: string;
  patch: Partial<Omit<ChatMessage, 'id' | 'createdAt'>>;
}): Promise<ChatMessage> {
  const meta = await requireChatMeta({ context, chatId });
  const messages = await readJsonlFile<ChatMessage>(getChatMessagesPath({ context, chatId: meta.id }));
  const index = messages.findIndex((message) => message.id === messageId);

  if (index === -1) {
    throw new FileRepositoryError('repository.readFailed', `Message not found: ${messageId}`, { id: messageId });
  }

  const nextMessage = { ...messages[index], ...patch };
  messages[index] = nextMessage;
  await replaceChatJsonl({ context, chatId: meta.id, fileName: 'messages.jsonl', entries: messages });
  await touchChatMeta({ context, meta });
  await rebuildChatIndex({ context });
  return nextMessage;
}
