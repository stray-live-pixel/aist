import type { Chat } from '../../../shared/types/types';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import type { ChatStatePatch } from './ChatStatePatch';
import { normalizeState } from './normalizeState';
import { readChatState } from './readChatState';
import { requireChat } from './requireChat';
import { requireChatMeta } from './requireChatMeta';
import { writeChatState } from './writeChatState';

/**
 * Что это: обновление transient-состояния чата.
 * Зачем нужно: runtime часто меняет busy/activity/context без изменения сообщений.
 * Какую продуктовую проблему решает: webview видит актуальный прогресс агента и сохраняет его при refresh.
 */
export async function updateChatState({
  context,
  chatId,
  patch
}: {
  context: ChatRepositoryContext;
  chatId: string;
  patch: ChatStatePatch;
}): Promise<Chat> {
  const meta = await requireChatMeta({ context, chatId });
  const currentState = await readChatState({ context, chatId: meta.id });

  await writeChatState({ context, chatId: meta.id, state: normalizeState({ state: { ...currentState, ...patch } }) });

  return requireChat({ context, chatId });
}
