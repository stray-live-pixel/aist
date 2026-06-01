import { type AgentLanguage, type ChatSummary } from '../../../shared/types';
import { formatChatDate } from './formatChatDate';
import { translateChatMetaMessage } from './translateChatMetaMessage';

export function formatChatMeta(chat: ChatSummary, language: AgentLanguage): string {
  const messageLabel = translateChatMetaMessage(language, chat.messageCount);
  return `${messageLabel} - ${formatChatDate(chat.lastMessageAt, language)}`;
}
