import type { ChatMessage } from './chatMessage';
import type { ChatModelRequestStatus, ChatModelSettings } from './chatModel';
import type { ChatContextEstimate, ChatPlan, ChatUsageEstimate } from './chatPlan';
import type { OpenRouterMessage } from './model';
import type { AgentReflectionCandidate } from './reflection';
import type { AgentRunActivity } from './runtimeStatus';

export type ChatVcsState = {
  command: string;
  branch: string;
  baseBranch?: string;
  isolated: boolean;
};

export type Chat = {
  id: string;
  title: string;
  model: string;
  modelSettings: ChatModelSettings;
  previousChatId?: string;
  compactedAt?: number;
  compactionModel?: string;
  vcs?: ChatVcsState;
  messages: ChatMessage[];
  history: OpenRouterMessage[];
  lastAnswer: string;
  activity?: AgentRunActivity;
  activityDetail?: string;
  modelRequest?: ChatModelRequestStatus;
  busy: boolean;
  context?: ChatContextEstimate;
  contextLength?: number;
  activePlan?: ChatPlan;
  reflectionCandidates?: AgentReflectionCandidate[];
  usage: ChatUsageEstimate;
  createdAt: number;
  updatedAt: number;
};

export type ChatSummary = {
  id: string;
  title: string;
  model: string;
  modelSettings: ChatModelSettings;
  previousChatId?: string;
  compactedAt?: number;
  compactionModel?: string;
  vcs?: ChatVcsState;
  messageCount: number;
  lastUserMessage: string;
  busy: boolean;
  activity?: AgentRunActivity;
  activityDetail?: string;
  lastMessageAt: number;
  updatedAt: number;
};
