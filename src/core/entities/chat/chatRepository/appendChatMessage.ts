import type { ChatMessage } from '../../../shared/types/types';
import { appendJsonl } from '../../storage/storage';
import type { ChatMessageInput } from './ChatMessageInput';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import { DEFAULT_TITLE } from './DEFAULT_TITLE';
import { createChatMessage } from './createChatMessage';
import { getChatMessagesPath } from './getChatMessagesPath';
import { requireChat } from './requireChat';
import { requireChatMeta } from './requireChatMeta';
import { toSingleLinePreview } from './toSingleLinePreview';
import { upsertChatIndexSummary } from './upsertChatIndexSummary';
import { writeChatMeta } from './writeChatMeta';

/**
 * Что это: добавление UI-сообщения в messages.jsonl.
 * Зачем нужно: пользовательские и assistant-сообщения пишутся append-only, пока runtime не делает status update.
 * Какую продуктовую проблему решает: диалог сразу появляется в истории и получает понятный title из первого вопроса.
 */
export async function appendChatMessage({
  context,
  chatId,
  message
}: {
  context: ChatRepositoryContext;
  chatId: string;
  message: ChatMessageInput;
}): Promise<ChatMessage> {
  const meta = await requireChatMeta({ context, chatId });
  const now = context.now();
  const nextMessage = createChatMessage({ context, message, now });

  await appendJsonl(getChatMessagesPath({ context, chatId: meta.id }), nextMessage);
  await writeChatMeta({
    context,
    meta: { ...meta, title: getNextTitle({ title: meta.title, message: nextMessage }), updatedAt: now }
  });
  const updatedChat = await requireChat({ context, chatId: meta.id });
  await upsertChatIndexSummary({ context, chat: updatedChat });
  return nextMessage;
}

/**
 * Что это: выбор заголовка после нового сообщения.
 * Зачем нужно: default-title заменяется первым осмысленным пользовательским запросом.
 * Какую продуктовую проблему решает: новый чат можно найти в истории без ручного переименования.
 */
function getNextTitle({ title, message }: { title: string; message: ChatMessage }): string {
  return title === DEFAULT_TITLE && message.role === 'user' && message.content
    ? toSingleLinePreview({ value: message.content, maxLength: 50 }) || title
    : title;
}
