import type { Chat } from '../../../shared/types/types';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import { DEFAULT_TITLE } from './DEFAULT_TITLE';
import { normalizeState } from './normalizeState';
import { normalizeUsage } from './normalizeUsage';
import { replaceChatJsonl } from './replaceChatJsonl';
import { requireChat } from './requireChat';
import { requireChatMeta } from './requireChatMeta';
import { upsertChatIndexSummary } from './upsertChatIndexSummary';
import { writeChatMeta } from './writeChatMeta';
import { writeChatState } from './writeChatState';

/**
 * Что это: очистка сообщений, history и transient-состояния чата.
 * Зачем нужно: пользователь может переиспользовать существующий чат как новый диалог.
 * Какую продуктовую проблему решает: clear не оставляет старые tool/status/history следы в UI и runtime.
 */
export async function clearChat({
  context,
  chatId
}: {
  context: ChatRepositoryContext;
  chatId: string;
}): Promise<Chat> {
  const meta = await requireChatMeta({ context, chatId });
  const now = context.now();

  await writeChatMeta({
    context,
    meta: { ...meta, title: DEFAULT_TITLE, lastAnswer: '', usage: normalizeUsage({ usage: undefined }), updatedAt: now }
  });
  await writeChatState({ context, chatId: meta.id, state: normalizeState({ state: undefined }) });
  await replaceChatJsonl({ context, chatId: meta.id, fileName: 'messages.jsonl', entries: [] });
  await replaceChatJsonl({ context, chatId: meta.id, fileName: 'history.jsonl', entries: [] });

  const clearedChat = await requireChat({ context, chatId: meta.id });
  await upsertChatIndexSummary({ context, chat: clearedChat });
  return clearedChat;
}
