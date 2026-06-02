import type { Chat } from '../../../chats/types';

/**
 * Что это: возвращает текст последнего user-сообщения в чате.
 * Зачем нужно: summary показывает последнюю пользовательскую задачу.
 * Какую проблему решает: список чатов остаётся информативным без чтения всей истории.
 */
export function getLastUserMessage({ chat }: { chat: Chat }): string {
  return [...chat.messages].reverse().find((message) => message.role === 'user')?.content || '';
}
