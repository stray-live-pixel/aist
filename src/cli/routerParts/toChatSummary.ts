import { type Chat, type ChatSummary } from '../../core/shared/types/types';
import { getCliChatTitle } from './getCliChatTitle';
import { toSingleLinePreview } from './toSingleLinePreview';

export function toChatSummary(chat: Chat): ChatSummary {
  const userAssistantMessages = chat.messages.filter(
    (message) => message.role === 'user' || message.role === 'assistant'
  );
  const lastUserMessage = [...chat.messages]
    .reverse()
    .find((message) => message.role === 'user' && message.content?.trim());

  return {
    id: chat.id,
    title: getCliChatTitle(chat),
    model: chat.model,
    modelSettings: chat.modelSettings,
    previousChatId: chat.previousChatId,
    compactedAt: chat.compactedAt,
    compactionModel: chat.compactionModel,
    messageCount: userAssistantMessages.length,
    lastUserMessage: lastUserMessage ? toSingleLinePreview(lastUserMessage.content || '', 50) : '',
    busy: chat.busy,
    lastMessageAt: chat.messages.at(-1)?.createdAt || chat.createdAt,
    updatedAt: chat.updatedAt
  };
}
