import type { ChatMessage } from '../../../shared/types/types';
import type { ChatMessageInput } from './ChatMessageInput';
import type { ChatRepositoryContext } from './ChatRepositoryContext';

/**
 * Что это: материализация сообщения с id и временем создания.
 * Зачем нужно: append/create принимают частичные сообщения, но storage хранит полный формат.
 * Какую продуктовую проблему решает: все сообщения можно стабильно обновлять и отображать после restart.
 */
export function createChatMessage({
  context,
  message,
  now
}: {
  context: ChatRepositoryContext;
  message: ChatMessageInput;
  now: number;
}): ChatMessage {
  return {
    ...message,
    id: message.id || context.idFactory(),
    createdAt: message.createdAt || now
  };
}
