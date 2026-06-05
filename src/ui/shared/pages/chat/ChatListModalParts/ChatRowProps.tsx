import { type AgentLanguage, type ChatSummary } from '../../../types';

export type ChatRowProps = {
  chat: ChatSummary;
  active: boolean;
  confirmingDelete: boolean;
  language: AgentLanguage;
  onSelect(): void;
  onDuplicate(): void;
  onOpenInEditor(): void;
  onAskDelete(): void;
  onCancelDelete(): void;
  onDelete(): void;
};
