import type { Chat } from '../../../chats/types';

/**
 * Что это: вычисляет timestamp последней активности чата.
 * Зачем нужно: список чатов сортируется и отображает актуальность диалога.
 * Какую проблему решает: пустые чаты получают fallback на updatedAt/createdAt.
 */
export function getLastMessageAt({ chat }: { chat: Chat }): number {
  return chat.messages[chat.messages.length - 1]?.createdAt || chat.updatedAt || chat.createdAt;
}
