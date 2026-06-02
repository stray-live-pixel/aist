import { randomUUID } from 'node:crypto';

import type { ChatMessage } from '../../../chats/types';
import { requireChat } from './requireChat';
import { touchChat } from './touchChat';
import type { DaemonChatStoreState } from './types';

/**
 * Что это: добавляет локальное UI-сообщение в чат.
 * Зачем нужно: optimistic UI может показать user/tool message до очередного daemon snapshot.
 * Какую продуктовую проблему решает: чат ощущается отзывчивым при отправке сообщения.
 */
export function appendLocalMessage({
  state,
  chatId,
  message
}: {
  state: DaemonChatStoreState;
  chatId: string;
  message: Omit<ChatMessage, 'id' | 'createdAt'>;
}): ChatMessage {
  const chat = requireChat({ state, chatId });
  const next = { id: randomUUID(), createdAt: Date.now(), ...message };
  chat.messages.push(next);
  touchChat({ state, chat });
  return next;
}
