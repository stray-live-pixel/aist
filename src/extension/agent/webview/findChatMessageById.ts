import type { Chat } from '../../chats/types';

/**
 * Что это: находит актуальное сообщение в уже обновлённом backend-backed chat store.
 * Зачем нужно: tool approval/completed events несут messageId, но не весь ChatMessage; UI получает точный patch
 * из source of truth и не ждёт тяжёлый full state.
 */
export function findChatMessageById(chat: Chat, messageId: string | undefined): Chat['messages'][number] | undefined {
  if (!messageId) {
    return undefined;
  }

  return chat.messages.find((message) => message.id === messageId);
}
