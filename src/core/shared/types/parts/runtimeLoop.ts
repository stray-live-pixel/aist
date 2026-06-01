import type { ToolApprovalDecision } from './approval';
import type { ChatMessage, ChatModelRequestStatus, ChatUsageEstimate } from './chat';
import type { JsonObject } from './json';
import type { ModelStreamCallbacks, ModelTransportMessage, OpenRouterMessage, ToolCall } from './model';
import type { AgentRunActivity, AgentRunStatus } from './runtimeStatus';
import type { RuntimeToolResult } from './toolResult';

export type AgentActivityStream = ModelStreamCallbacks & {
  reset(): void;
  hasContent(): boolean;
};

/**
 * Mutable in-process state for one active agent run.
 *
 * This is Node-safe but intentionally not serializable: AbortController and approval
 * resolvers stay inside the runtime. CLI/daemon clients should observe RuntimeEvent.
 */
export type AgentRun<TTelemetry = unknown> = {
  chatId: string;
  startedAt: number;
  prompt: string;
  abortController: AbortController;
  stopRequested: boolean;
  activityStream?: AgentActivityStream;
  permissionResolvers: Map<string, (decision: ToolApprovalDecision) => void>;
  telemetry?: TTelemetry;
};

/**
 * Result of a full agent loop after all model and tool turns.
 *
 * Controllers use it as a single commit point: history, final answer and usage
 * are saved only after the loop has completed successfully.
 */
export type AgentLoopResult = {
  answer: string;
  history: OpenRouterMessage[];
  usage: ChatUsageEstimate;
};

/**
 * Repeated tool call that stopped the agent loop.
 *
 * The signature excludes reason because wording can change while the substantial
 * tool and arguments remain the same.
 */
export type RepeatedToolCall = {
  signature: string;
  count: number;
  toolName: string;
  args: Record<string, unknown>;
};

export type RuntimeRunSnapshot = {
  id: string;
  chatId: string;
  status: AgentRunStatus;
  prompt?: string;
  startedAt: number;
  finishedAt?: number;
  activity?: AgentRunActivity;
  activityDetail?: string;
  model?: string;
  usage?: ChatUsageEstimate;
};

export type RuntimeToolCallSnapshot = {
  id: string;
  name: string;
  args: JsonObject;
  reason?: string;
  nextStep?: string;
};

export type RuntimeModelToolCall = Omit<ToolCall, 'function'> & {
  function: {
    name: string;
    arguments?: string | JsonObject;
  };
};

export type RuntimeModelMessage = Omit<ModelTransportMessage, 'tool_calls'> & {
  tool_calls?: RuntimeModelToolCall[];
};

export type RuntimeChatMessage = Omit<ChatMessage, 'args' | 'result' | 'modelResult'> & {
  args?: JsonObject;
  result?: RuntimeToolResult;
  modelResult?: RuntimeToolResult;
};

export type RuntimeErrorInfo = {
  message: string;
  code?: string;
  stack?: string;
};

/**
 * JSON-serializable event stream for CLI and daemon clients.
 *
 * One user prompt can produce many events: a run may issue several model requests,
 * stream partial activity, ask for one or more tool approvals, execute tools and
 * then ask the model again. Consumers should therefore reduce events by runId/chatId
 * instead of assuming a single request maps to a single response.
 */
