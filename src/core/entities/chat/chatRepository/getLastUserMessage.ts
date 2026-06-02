import type { Chat } from '../../../shared/types/types';
import { toSingleLinePreview } from './toSingleLinePreview';

/**
 * Что это: достаёт последний пользовательский запрос в виде короткого preview.
 * Зачем нужно: summary показывает, чем завершился пользовательский контекст.
 * Какую продуктовую проблему решает: история чатов остаётся понятной без открытия каждого диалога.
 */
export function getLastUserMessage({ chat }: { chat: Chat }): string {
  const lastUserMessage = [...chat.messages]
    .reverse()
    .find((message) => message.role === 'user' && message.content?.trim());

  return lastUserMessage ? toSingleLinePreview({ value: lastUserMessage.content || '', maxLength: 50 }) : '';
}
