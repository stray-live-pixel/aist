import type { Chat } from '../../../shared/types/types';
import { toSingleLinePreview } from './toSingleLinePreview';

/**
 * Что это: выбирает продуктовый заголовок для summary чата.
 * Зачем нужно: если есть первое пользовательское сообщение, оно лучше описывает диалог, чем default title.
 * Какую продуктовую проблему решает: пользователь быстрее находит нужный чат в истории.
 */
export function getChatTitle({ chat }: { chat: Chat }): string {
  const firstUserMessage = chat.messages.find((message) => message.role === 'user' && message.content?.trim());
  return firstUserMessage
    ? toSingleLinePreview({ value: firstUserMessage.content || '', maxLength: 50 }) || chat.title
    : chat.title;
}
