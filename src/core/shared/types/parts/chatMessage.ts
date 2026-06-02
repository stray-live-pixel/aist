import type { SubagentKind } from './chatSubagent';
import type { ToolResult } from './toolResult';

export type ChatMessageSubagentRef = {
  runId: string;
  kind: SubagentKind;
  title: string;
};

export type ChatMessageRole = 'user' | 'assistant' | 'status' | 'tool' | 'error' | 'subagent';
export type ChatToolStatus = 'waiting' | 'running' | 'done' | 'error' | 'denied';
export type ChatSubagentStatus = 'running' | 'done' | 'error';
export type ChatToolApprovalStatus = 'pending' | 'approved' | 'denied';

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content?: string;
  name?: string;
  status?: ChatToolStatus | ChatSubagentStatus;
  approval?: ChatToolApprovalStatus;
  reason?: string;
  nextStep?: string;
  args?: Record<string, unknown>;
  result?: ToolResult;
  modelResult?: ToolResult;
  userApprovalComment?: string;
  userComment?: string;
  usage?: ChatMessageUsageEstimate;
  marker?: string;
  subagent?: ChatMessageSubagentRef;
  subagentRunId?: string;
  subagentKind?: SubagentKind;
  createdAt: number;
};

export type ChatMessageUsageEstimate = {
  tokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  costUsd?: number;
};
