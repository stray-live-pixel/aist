import type { Chat } from '../../../chats/types';
import { getLastUserMessage } from './getLastUserMessage';

/**
 * Что это: выбирает понятный заголовок чата для списка.
 * Зачем нужно: новый чат без имени показывает начало последнего пользовательского запроса.
 * Какую проблему решает: пользователь быстрее узнаёт чат в sidebar даже до явного переименования.
 */
export function getChatTitle({ chat }: { chat: Chat }): string {
  const firstUser = getLastUserMessage({ chat });
  return chat.title === 'New chat' && firstUser ? firstUser.slice(0, 50) : chat.title;
}
