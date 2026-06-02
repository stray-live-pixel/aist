import type { Chat } from '../../../shared/types/types';

/**
 * Что это: вычисляет время последнего сообщения чата.
 * Зачем нужно: список чатов сортируется и показывает актуальность диалога.
 * Какую продуктовую проблему решает: свежие разговоры поднимаются наверх даже после append message.
 */
export function getLastMessageAt({ chat }: { chat: Chat }): number {
  return chat.messages.at(-1)?.createdAt || chat.createdAt;
}
