import { type AgentLanguage, type ChatSummary } from '../../../shared/types';

export type ChatListModalProps = {
  chats: ChatSummary[];
  activeChatId: string;
  language: AgentLanguage;
  onClose(): void;
};
