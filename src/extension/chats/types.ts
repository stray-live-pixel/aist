import type { OpenRouterMessage } from '../openrouter/types';

export type ChatMessageRole = 'user' | 'assistant' | 'status' | 'tool' | 'error';

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content?: string;
  name?: string;
  status?: 'waiting' | 'running' | 'done' | 'error' | 'denied';
  approval?: 'pending' | 'approved' | 'denied';
  reason?: string;
  args?: Record<string, unknown>;
  result?: Record<string, unknown>;
  usage?: ChatMessageUsageEstimate;
  createdAt: number;
};

export type ChatMessageUsageEstimate = {
  tokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  costUsd?: number;
};

export type ChatUsageEstimate = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd?: number;
};

export type ChatContextEstimate = {
  tokens: number;
  maxTokens?: number;
  percent?: number;
  inputCostUsd?: number;
};

export type Chat = {
  id: string;
  title: string;
  model: string;
  messages: ChatMessage[];
  history: OpenRouterMessage[];
  lastAnswer: string;
  activity?: 'thinking' | 'waitingForApproval' | 'runningTool' | 'stopping';
  busy: boolean;
  context?: ChatContextEstimate;
  contextLength?: number;
  usage: ChatUsageEstimate;
  createdAt: number;
  updatedAt: number;
};

export type ChatSummary = {
  id: string;
  title: string;
  model: string;
  messageCount: number;
  busy: boolean;
  lastMessageAt: number;
  updatedAt: number;
};
