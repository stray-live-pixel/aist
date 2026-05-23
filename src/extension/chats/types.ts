import type { OpenRouterMessage } from '../openrouter/types';

export type ChatMessageRole = 'user' | 'assistant' | 'status' | 'tool' | 'error';

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content?: string;
  name?: string;
  status?: 'running' | 'done' | 'error';
  args?: Record<string, unknown>;
  result?: Record<string, unknown>;
  createdAt: number;
};

export type Chat = {
  id: string;
  title: string;
  model: string;
  messages: ChatMessage[];
  history: OpenRouterMessage[];
  lastAnswer: string;
  busy: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ChatSummary = {
  id: string;
  title: string;
  model: string;
  messageCount: number;
  busy: boolean;
  updatedAt: number;
};
