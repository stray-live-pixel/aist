import type { AgentMemoryItem } from '../../core/entities/memory/memory';
import type { AgentReflectionCandidate, ChatModelSettings, ChatSummary } from '../../core/shared/types/types';
import type { DaemonChat } from './chatView';

export type DaemonChatCreateParams = {
  readonly model?: string;
  readonly modelSettings?: ChatModelSettings;
};

export type DaemonChatCreateResult = {
  readonly operationId: string;
  readonly chat: DaemonChat;
};

export type DaemonChatListResult = {
  readonly operationId: string;
  readonly chats: readonly ChatSummary[];
};

export type DaemonChatGetParams = {
  readonly chatId: string;
};

export type DaemonChatGetResult = {
  readonly operationId: string;
  readonly chat: DaemonChat;
};

export type DaemonChatAskParams = {
  readonly chatId: string;
  readonly prompt: string;
  readonly skipUserMessage?: boolean;
};

export type DaemonChatAskResult = {
  readonly operationId: string;
  readonly runId: string;
  readonly chatId: string;
  readonly accepted: true;
};

export type DaemonChatStopParams = {
  readonly runId?: string;
  readonly chatId?: string;
};

export type DaemonChatStopResult = {
  readonly operationId: string;
  readonly stopped: boolean;
  readonly runId?: string;
};

export type DaemonChatDeleteParams = {
  readonly chatId: string;
};

export type DaemonChatDeleteResult = {
  readonly operationId: string;
  readonly deleted: boolean;
  readonly nextChatId?: string;
};

export type DaemonChatClearParams = {
  readonly chatId: string;
};

export type DaemonChatClearResult = {
  readonly operationId: string;
  readonly chat: DaemonChat;
};

export type DaemonChatSetModelParams = {
  readonly chatId: string;
  readonly model: string;
};

export type DaemonChatSetModelResult = {
  readonly operationId: string;
  readonly chat: DaemonChat;
};

export type DaemonChatSetModelSettingsParams = {
  readonly chatId: string;
  readonly settings: Partial<ChatModelSettings>;
};

export type DaemonChatSetModelSettingsResult = {
  readonly operationId: string;
  readonly chat: DaemonChat;
};

export type DaemonChatCompactParams = {
  readonly chatId: string;
  readonly keepLastMessages?: number;
  readonly summary?: string;
};

export type DaemonChatCompactResult = {
  readonly operationId: string;
  readonly chat: DaemonChat;
};

export type DaemonChatMemoryAnalyzeParams = {
  readonly chatId: string;
};

export type DaemonChatMemoryAnalyzeResult = {
  readonly operationId: string;
  readonly chat: DaemonChat;
  readonly candidates: readonly AgentReflectionCandidate[];
};

export type DaemonChatReflectionCandidateActionParams = {
  readonly chatId: string;
  readonly candidateId: string;
};

export type DaemonChatReflectionCandidateSaveResult = {
  readonly operationId: string;
  readonly chat: DaemonChat;
  readonly candidate?: AgentReflectionCandidate;
  readonly memoryItem?: AgentMemoryItem;
};

export type DaemonChatReflectionCandidateRejectResult = {
  readonly operationId: string;
  readonly chat: DaemonChat;
  readonly candidate?: AgentReflectionCandidate;
};
