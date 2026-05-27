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
  modelResult?: Record<string, unknown>;
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

export type ChatUsageEstimate = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd?: number;
};

/** Статус пункта активного плана; хранится в чате и синхронизируется в sticky UI. */
export type ChatPlanItemStatus = 'pending' | 'in_progress' | 'done' | 'blocked';

/** Один короткий шаг плана. id стабилен внутри текущей версии плана и нужен React-рендеру. */
export type ChatPlanItem = {
  id: string;
  text: string;
  status: ChatPlanItemStatus;
};

/** Активный план работ по текущему чату, которым управляют planning tools модели. */
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

export type Chat = {
  id: string;
  title: string;
  model: string;
  previousChatId?: string;
  compactedAt?: number;
  messages: ChatMessage[];
  history: OpenRouterMessage[];
  lastAnswer: string;
  activity?: 'thinking' | 'waitingForApproval' | 'runningTool' | 'answering' | 'stopping';
  activityDetail?: string;
  modelRequest?: ChatModelRequestStatus;
  busy: boolean;
  context?: ChatContextEstimate;
  contextLength?: number;
  activePlan?: ChatPlan;
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
  messageCount: number;
  lastUserMessage: string;
  busy: boolean;
  lastMessageAt: number;
  updatedAt: number;
};
