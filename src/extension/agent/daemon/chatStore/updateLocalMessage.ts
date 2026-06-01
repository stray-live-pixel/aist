import type { ChatMessage } from '../../../chats/types';
import { requireChat } from './requireChat';
import { touchChat } from './touchChat';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: обновляет локальное сообщение без добавления дубля.
 * Зачем нужно: approval preview и tool status patch должны править уже существующую карточку.
 * Какую продуктовую проблему решает: пользователь видит актуальное состояние tool approval в одном сообщении.
 */
export function updateLocalMessage({
  state,
  chatId,
  messageId,
  patch
}: {
  state: DaemonChatStoreState;
  chatId: string;
  messageId: string;
  patch: Partial<Omit<ChatMessage, 'id' | 'createdAt'>>;
}): ChatMessage {
  const chat = requireChat({ state, chatId });
  const message = chat.messages.find((item) => item.id === messageId);
  if (!message) {
    throw new Error(`Message not found: ${messageId}`);
  }

  Object.assign(message, patch);
  touchChat({ state, chat });
  return message;
}
