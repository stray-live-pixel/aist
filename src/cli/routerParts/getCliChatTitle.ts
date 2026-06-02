import { type Chat } from '../../core/shared/types/types';
import { toSingleLinePreview } from './toSingleLinePreview';

export function getCliChatTitle(chat: Chat): string {
  const firstUserMessage = chat.messages.find((message) => message.role === 'user' && message.content?.trim());
  return firstUserMessage ? toSingleLinePreview(firstUserMessage.content || '', 50) || chat.title : chat.title;
}
