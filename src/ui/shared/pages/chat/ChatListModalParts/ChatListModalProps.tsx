import { type AgentLanguage, type ChatSummary } from '../../../types';

export type ChatListModalProps = {
  chats: ChatSummary[];
  activeChatId: string;
  language: AgentLanguage;
  onClose(): void;
};
