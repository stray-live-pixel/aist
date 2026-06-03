import type { AgentReflectionCandidate } from './agentConfig';
import type { AgentAttachment } from './attachment';
import type { CodexServiceTier, EditorContextMode, ReasoningEffort } from './model';
import type { SubagentKind } from './subagent';

export type ChatMessageSubagentRef = {
  runId: string;
  kind: SubagentKind;
  title: string;
};

export type ChatMessageRole = 'user' | 'assistant' | 'status' | 'tool' | 'error' | 'subagent';

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content?: string;
  attachments?: AgentAttachment[];
  name?: string;
  status?: 'waiting' | 'running' | 'done' | 'error' | 'denied';
  approval?: 'pending' | 'approved' | 'denied';
  reason?: string;
  nextStep?: string;
  args?: Record<string, unknown>;
  result?: Record<string, unknown>;
  modelResult?: Record<string, unknown>;
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

export type ChatVcsState = {
  command: string;
  branch: string;
  baseBranch?: string;
  isolated: boolean;
};

/**
 * Что это: настройки выполнения модели, сохранённые внутри конкретного чата.
 * Зачем нужно: каждый диалог может иметь собственную модель, reasoning и быстрые режимы без влияния на другие чаты.
 * Какую продуктовую проблему решает: режим «без инструментов» включается только для текущего чата.
 */
export type ChatModelSettings = {
  model: string;
  reasoningEffort: ReasoningEffort;
  codexServiceTier: CodexServiceTier;
  maxToolIterations: number;
  editorContextMode: EditorContextMode;
  streamingEnabled: boolean;
  /** Когда true, текущий чат отправляет запрос модели без tool schemas и завершает ответ без tool-loop. */
  toolsDisabled: boolean;
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
  activity?: 'thinking' | 'waitingForApproval' | 'runningTool' | 'answering' | 'stopping';
  activityDetail?: string;
  lastMessageAt: number;
  updatedAt: number;
};

export type ChatUsageEstimate = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd?: number;
};

export type ChatContextEstimate = {
  tokens?: number;
  maxTokens?: number;
  percent?: number;
  inputCostUsd?: number;
};

export type ChatPlanItemStatus = 'pending' | 'in_progress' | 'done' | 'blocked';

export type ChatPlanItem = {
  id: string;
  text: string;
  status: ChatPlanItemStatus;
};

export type ChatPlan = {
  title: string;
  items: ChatPlanItem[];
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
  provider?: 'openrouter' | 'codex';
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

export type CompactPreviousChat = Omit<Chat, 'previousChat'>;

export type Chat = {
  id: string;
  title: string;
  model: string;
  modelSettings: ChatModelSettings;
  previousChatId?: string;
  compactedAt?: number;
  compactionModel?: string;
  vcs?: ChatVcsState;
  previousChat?: CompactPreviousChat;
  messages: ChatMessage[];
  lastAnswer: string;
  activity?: 'thinking' | 'waitingForApproval' | 'runningTool' | 'answering' | 'stopping';
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
