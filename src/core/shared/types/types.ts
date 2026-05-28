/**
 * Core остаётся независимым от VS Code API, чтобы один и тот же runtime можно
 * было подключать из CLI и из VS Code adapter без скрытой зависимости от editor host.
 */
export interface CoreRuntimeBoundary {
  readonly layer: 'core';
  readonly vscodeImportsAllowed: false;
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;
export type JsonObject = {
  [key: string]: JsonValue | undefined;
};

export type ModelProvider = 'openrouter' | 'codex';
export type CodexServiceTier = 'auto' | 'priority';
export type ReasoningEffort = 'auto' | 'low' | 'medium' | 'high';
export type EditorContextMode = 'auto' | 'selection' | 'file' | 'off';

export type ModelTransportRole = 'system' | 'user' | 'assistant' | 'tool';
export type OpenRouterRole = ModelTransportRole;

export type ModelUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type ToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments?: string | Record<string, unknown>;
  };
};

export type ModelTransportMessage = {
  role: ModelTransportRole;
  content?: string;
  reasoning?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  usage?: ModelUsage;
};

export type OpenRouterMessage = ModelTransportMessage;

export type ModelStreamCallbacks = {
  onReasoningDelta?(delta: string): void;
  onContentDelta?(delta: string): void;
  onComplete?(): void;
};

export type ModelHttpResponseInfo = {
  status: number;
  statusText: string;
};

export type ModelRequestLifecycleCallbacks = {
  onResponseHeaders?(info: ModelHttpResponseInfo): void;
};

export type ModelTransportTool = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type OpenRouterTool = ModelTransportTool;

export type OpenRouterModelOption = {
  id: string;
  name: string;
  provider: ModelProvider;
  contextLength?: number;
  pricing?: OpenRouterModelPricing;
  supportsTools: boolean;
  /**
   * Service tiers that can be sent to the ChatGPT Codex Responses API for this model.
   * Missing value means the UI hides the selector and the transport omits service_tier.
   */
  codexServiceTiers?: Exclude<CodexServiceTier, 'auto'>[];
};

export type OpenRouterModelPricing = {
  prompt?: number;
  completion?: number;
};

export type ChatMessageRole = 'user' | 'assistant' | 'status' | 'tool' | 'error';
export type ChatToolStatus = 'waiting' | 'running' | 'done' | 'error' | 'denied';
export type ChatToolApprovalStatus = 'pending' | 'approved' | 'denied';

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content?: string;
  name?: string;
  status?: ChatToolStatus;
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
  createdAt: number;
};

export type ChatMessageUsageEstimate = {
  tokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  costUsd?: number;
};

export type AgentReflectionCandidateKind =
  | 'memory_preference'
  | 'project_lesson'
  | 'verification_command'
  | 'declarative_definition';

export type AgentReflectionCandidateStatus = 'pending' | 'saved' | 'rejected';

export type AgentReflectionCandidate = {
  id: string;
  kind: AgentReflectionCandidateKind;
  title: string;
  content: string;
  reason?: string;
  scope?: 'global' | 'project' | 'local';
  status: AgentReflectionCandidateStatus;
  createdAt: number;
};

export type ChatUsageEstimate = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd?: number;
};

/** Status of an active plan item; persisted in chat state and mirrored to sticky UI. */
export type ChatPlanItemStatus = 'pending' | 'in_progress' | 'done' | 'blocked';

/** One short plan step. The id is stable within the current plan version for React rendering. */
export type ChatPlanItem = {
  id: string;
  text: string;
  status: ChatPlanItemStatus;
};

/** Active working plan for the current chat, controlled by model planning tools. */
export type ChatPlan = {
  title: string;
  items: ChatPlanItem[];
};

export type ChatContextEstimate = {
  tokens?: number;
  maxTokens?: number;
  percent?: number;
  inputCostUsd?: number;
};

export type ChatModelRequestPhase =
  | 'sending'
  | 'receiving'
  | 'streaming'
  | 'completed'
  | 'retrying'
  | 'failed'
  | 'aborted';

export type ChatModelRequestStatus = {
  provider?: ModelProvider;
  model: string;
  attempt: number;
  maxAttempts: number;
  requestNumber: number;
  phase: ChatModelRequestPhase;
  stream: boolean;
  startedAt: number;
  updatedAt: number;
  durationMs?: number;
  endpoint?: string;
  method?: string;
  httpStatus?: number;
  httpStatusText?: string;
  retryable?: boolean;
  error?: string;
  responseBody?: string;
};

export type AgentRunActivity = 'thinking' | 'waitingForApproval' | 'runningTool' | 'answering' | 'stopping';

export type AgentRunStatus = 'running' | 'waitingForApproval' | 'stopping' | 'completed' | 'failed' | 'stopped';

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
  previousChatId?: string;
  compactedAt?: number;
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
  previousChatId?: string;
  compactedAt?: number;
  vcs?: ChatVcsState;
  messageCount: number;
  lastUserMessage: string;
  busy: boolean;
  activity?: AgentRunActivity;
  activityDetail?: string;
  lastMessageAt: number;
  updatedAt: number;
};

export type ToolResult = Record<string, unknown>;
export type RuntimeToolResult = JsonObject;

export type ApprovalDecisionAction = 'approve' | 'deny-stop' | 'deny-continue';
export type ApprovalStatus = 'pending' | 'approved' | 'denied';
export type ApprovalPreviewKind = 'none' | 'vscode-editable-diff' | 'headless-diff-artifact';
export type ToolExecutionMode = 'auto' | 'approval' | 'ui-assisted-preview';
export type ToolPermissionMode = 'ask' | 'auto';

export type RuntimeClientCapabilities = {
  vscodeEditableDiffPreview?: boolean;
};

export type RuntimeArtifactRef = JsonObject & {
  path: string;
  absolutePath?: string;
  bytes?: number;
  mimeType?: string;
  description?: string;
};

export type ApprovalPreviewFile = JsonObject & {
  path: string;
  oldContent?: string;
  proposedContent?: string;
  created?: boolean;
  replacements?: number;
  generatedReplacements?: number;
  changedStartLine?: number;
  changedStartColumn?: number;
  changedEndLine?: number;
  changedEndColumn?: number;
};

export type ApprovalPreviewPayload = JsonObject & {
  files?: ApprovalPreviewFile[];
  patch?: string;
  artifact?: RuntimeArtifactRef;
  instructions?: string;
  strategyUsed?: string;
  diagnostics?: JsonValue[];
};

export type ToolApprovalRequest = JsonObject & {
  approvalId: string;
  runId: string;
  toolCallId: string;
  toolName: string;
  reason?: string;
  args: JsonObject;
  previewKind: ApprovalPreviewKind;
  previewPayload?: ApprovalPreviewPayload;
  status: ApprovalStatus;
  createdAt: number;
  updatedAt?: number;
  chatId?: string;
  messageId?: string;
};

export type ApprovalResolveRequest = {
  decision: ApprovalDecisionAction;
  comment?: string;
  rememberGlobal?: string;
  rememberProject?: string;
  previewResult?: ApprovalPreviewResolution;
};

export type ApprovalPreviewResolvedFile = JsonObject & {
  path: string;
  content: string;
  result?: RuntimeToolResult;
};

export type ApprovalPreviewResolution = JsonObject & {
  kind: 'file-content' | 'multi-file-content' | 'tool-result';
  path?: string;
  content?: string;
  files?: ApprovalPreviewResolvedFile[];
  result?: RuntimeToolResult;
};

export type ToolExecutionRequirement =
  | { mode: 'auto' }
  | { mode: 'approval'; previewKind?: Exclude<ApprovalPreviewKind, 'vscode-editable-diff'> }
  | { mode: 'ui-assisted-preview'; previewKind: 'vscode-editable-diff' };

/**
 * User decision for a tool approval prompt.
 *
 * approved runs the tool and may pass a note back to the model as userApprovalComment;
 * denial either stops the current agent loop or returns a denied tool result to the model.
 */
export type ToolApprovalDecision = {
  action?: ApprovalDecisionAction;
  approved: boolean;
  continueAfterDeny: boolean;
  comment?: string;
  rememberGlobal?: string;
  rememberProject?: string;
  previewResult?: ApprovalPreviewResolution;
};

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
export type RuntimeEvent =
  | {
      type: 'run.started';
      run: RuntimeRunSnapshot;
      at: number;
    }
  | {
      type: 'run.activity';
      runId: string;
      chatId: string;
      activity: AgentRunActivity;
      detail?: string;
      at: number;
    }
  | {
      type: 'run.completed';
      run: RuntimeRunSnapshot;
      answer: string;
      usage: ChatUsageEstimate;
      at: number;
    }
  | {
      type: 'run.failed';
      runId: string;
      chatId: string;
      error: RuntimeErrorInfo;
      at: number;
    }
  | {
      type: 'run.stopped';
      runId: string;
      chatId: string;
      reason?: string;
      at: number;
    }
  | {
      type: 'run.finished';
      run: RuntimeRunSnapshot;
      status: Extract<AgentRunStatus, 'completed' | 'stopped'>;
      answer?: string;
      usage?: ChatUsageEstimate;
      reason?: string;
      at: number;
    }
  | {
      type: 'run.error';
      runId: string;
      chatId: string;
      error: RuntimeErrorInfo;
      at: number;
    }
  | {
      type: 'message.appended';
      chatId: string;
      message: RuntimeChatMessage;
      at: number;
    }
  | {
      type: 'chat.updated';
      chatId: string;
      reason?: string;
      at: number;
    }
  | {
      type: 'model.request.updated';
      runId: string;
      chatId: string;
      request: ChatModelRequestStatus;
      at: number;
    }
  | {
      type: 'model.response';
      runId: string;
      chatId: string;
      requestNumber: number;
      message: RuntimeModelMessage;
      usage?: ModelUsage;
      at: number;
    }
  | {
      type: 'tool.call.started';
      runId: string;
      chatId: string;
      messageId?: string;
      toolCall: RuntimeToolCallSnapshot;
      at: number;
    }
  | {
      type: 'tool.call.approvalRequested';
      runId: string;
      chatId: string;
      approvalId: string;
      messageId: string;
      approval: ToolApprovalRequest;
      toolCall: RuntimeToolCallSnapshot;
      preview?: RuntimeToolResult;
      at: number;
    }
  | {
      type: 'tool.call.approvalResolved';
      runId: string;
      chatId: string;
      approvalId: string;
      messageId: string;
      approval?: ToolApprovalRequest;
      decision: ToolApprovalDecision;
      at: number;
    }
  | {
      type: 'tool.call.completed';
      runId: string;
      chatId: string;
      messageId: string;
      toolCall: RuntimeToolCallSnapshot;
      result: RuntimeToolResult;
      modelResult?: RuntimeToolResult;
      at: number;
    }
  | {
      type: 'tool.call.failed';
      runId: string;
      chatId: string;
      messageId?: string;
      toolCall: RuntimeToolCallSnapshot;
      error: RuntimeErrorInfo;
      at: number;
    };

export type RuntimeEventType = RuntimeEvent['type'];
