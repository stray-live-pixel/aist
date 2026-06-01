import type { ChatSummary } from '../../../shared/types/types';

/**
 * Что это: persisted-индекс списка чатов.
 * Зачем нужно: экран истории быстро получает summaries без повторной сборки каждого раза.
 * Какую продуктовую проблему решает: список чатов остаётся быстрым даже при большой истории.
 */
export type StoredChatIndex = {
  schemaVersion: number;
  updatedAt: number;
  chats: ChatSummary[];
};
