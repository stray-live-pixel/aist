import type { AgentMemoryCandidate } from '../../../entities/memory/memory';
import type { AuxiliaryModelInvoker } from '../../../entities/model/auxiliaryModel';
import type { RunApprovalInput, RunToolResultInput } from '../../../entities/run/runRepository';
import type { ReasoningEffort } from '../../../shared/types/types';
import type {
  AgentRun,
  ApprovalPreviewKind,
  Chat,
  ChatMessage,
  ChatPlan,
  OpenRouterMessage,
  RuntimeEvent,
  ToolApprovalDecision,
  ToolCall,
  ToolPermissionMode
} from '../../../shared/types/types';
import type { ToolRegistry } from '../toolRegistry';

/** Что это: handle preview для tool approval; зачем нужно: preview можно approve/cleanup; проблема: пользователь видит diff до записи. */
export type ToolExecutionPreview = {
  preview: Record<string, unknown>;
  approvalPreviewKind?: ApprovalPreviewKind;
  approve(): Promise<Record<string, unknown>>;
  cleanup(): Promise<void>;
};

/** Что это: adapter выполнения tool; зачем нужно: filesystem/project/skills используют один контракт; проблема: runner не знает деталей транспорта. */
export type ToolRunnerExecutionAdapter = {
  execute(toolName: string, args: Record<string, unknown>): Promise<Record<string, unknown>>;
};

/** Что это: adapter подготовки preview; зачем нужно: approval может показать редактируемый diff; проблема: unsafe tools не применяются вслепую. */
export type ToolRunnerPreviewAdapter = {
  prepare(toolName: string, args: Record<string, unknown>): Promise<ToolExecutionPreview | undefined>;
};

/** Что это: запрос approval в UI/CLI; зачем нужно: service получает весь продуктовый контекст tool-call; проблема: пользователь принимает решение осознанно. */
export type ToolRunnerApprovalRequest = {
  chat: Chat;
  run: AgentRun;
  toolCall: ToolCall;
  messageId: string;
  reason: string;
  nextStep?: string;
  args: Record<string, unknown>;
  preview?: Record<string, unknown>;
};

/** Что это: approval service для runner; зачем нужно: permission и decision отделены от выполнения tools; проблема: политика approval расширяется без переписывания runner. */
export type ToolRunnerApprovalService = {
  getPermission(toolName: string, args: Record<string, unknown>): ToolPermissionMode;
  requestApproval(request: ToolRunnerApprovalRequest): Promise<ToolApprovalDecision>;
};

/** Что это: mutable context чата; зачем нужно: runner пишет tool messages/activity/plan; проблема: execution слой не зависит от конкретного storage. */
export type ToolRunnerMutableContext = {
  appendToolMessage(chatId: string, message: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage | Promise<ChatMessage>;
  updateToolMessage(
    chatId: string,
    messageId: string,
    patch: Partial<Omit<ChatMessage, 'id' | 'createdAt'>>
  ): ChatMessage | Promise<ChatMessage>;
  setActivity(chatId: string, activity: Chat['activity'], detail?: string): void | Promise<void>;
  getActivePlan(chatId: string): ChatPlan | undefined;
  setActivePlan(chatId: string, activePlan: ChatPlan): void | Promise<void>;
  sendState?(): void;
  throwIfStopped(run: AgentRun): void;
};

/** Что это: telemetry callbacks runner; зачем нужно: продуктовые метрики не смешиваются с execution логикой; проблема: можно считать starts/approvals/failures. */
export type ToolRunnerTelemetryRecorder = {
  recordToolStarted?(toolName: string): void;
  recordApprovalRequested?(): void;
  recordApprovalDecision?(approved: boolean): void;
  recordFailedEdit?(toolName: string): void;
};

/** Что это: memory service для approval notes; зачем нужно: пользователь может сохранить правило approval; проблема: повторные решения становятся быстрее. */
export type ToolRunnerMemoryService = { add(candidate: AgentMemoryCandidate): Promise<unknown> };

/** Что это: настройки auxiliary model tool; зачем нужно: invoke_model/spawn_agent читают отдельную модель/effort/tools policy; проблема: вспомогательная модель управляется отдельно. */
export type ToolRunnerAuxiliaryModelSettings = {
  model?: string;
  reasoningEffort?: ReasoningEffort;
  allowTools?: boolean;
};

/** Что это: вход запуска дочернего ИИ-агента; зачем нужно: tool runner передаёт adapter уже нормализованную задачу; проблема: основная модель делегирует независимые исследования без знания транспорта. */
export type ToolRunnerSpawnAgentInput = {
  parentChatId: string;
  prompt: string;
  system?: string;
  title?: string;
  mode: 'wait' | 'background';
  model?: string;
  reasoningEffort?: ReasoningEffort;
  allowTools?: boolean;
  signal?: AbortSignal;
};

/** Что это: adapter запуска дочерних ИИ-агентов; зачем нужно: core runner не зависит от daemon/runtime деталей; проблема: spawn_agent можно тестировать и менять без переписывания lifecycle tools. */
export type ToolRunnerAgentService = {
  spawn(input: ToolRunnerSpawnAgentInput): Promise<Record<string, unknown>>;
};

/** Что это: event emitter runtime; зачем нужно: run timeline получает tool/approval события; проблема: UI видит подробный прогресс. */
export type ToolRunnerEventEmitter = { emit(event: RuntimeEvent): void | Promise<void> };

/** Что это: run repository projection; зачем нужно: approval/tool results persist-ятся в run history; проблема: reconnect не теряет timeline. */
export type ToolRunnerRunRepository = {
  appendApproval?(runId: string, approval: RunApprovalInput): Promise<unknown>;
  appendToolResult?(runId: string, result: RunToolResultInput): Promise<unknown>;
};

/** Что это: formatter activity text; зачем нужно: caller может локализовать/упростить статусы; проблема: UI получает понятные статусы tool-call. */
export type ToolRunnerActivityFormatter = {
  prepare(toolName: string, reason: string): string;
  waitingApproval(toolName: string, reason: string): string;
  runningTool(toolName: string, reason: string): string;
};

/** Что это: зависимости ToolRunner; зачем нужно: runner остаётся чистым orchestration service; проблема: execution, approval, storage и telemetry подменяются в тестах. */
export type ToolRunnerDeps = {
  registry: ToolRegistry;
  context: ToolRunnerMutableContext;
  approvalService: ToolRunnerApprovalService;
  filesystem: ToolRunnerExecutionAdapter;
  projectTools?: ToolRunnerExecutionAdapter;
  skills?: ToolRunnerExecutionAdapter;
  preview?: ToolRunnerPreviewAdapter;
  memory?: ToolRunnerMemoryService;
  auxiliaryModel?: AuxiliaryModelInvoker;
  agentService?: ToolRunnerAgentService;
  getAuxiliaryModelSettings?(
    toolName: string
  ): ToolRunnerAuxiliaryModelSettings | Promise<ToolRunnerAuxiliaryModelSettings>;
  telemetry?: ToolRunnerTelemetryRecorder;
  events?: ToolRunnerEventEmitter;
  runRepository?: ToolRunnerRunRepository;
  workspaceRoot?: string;
  activityFormatter?: ToolRunnerActivityFormatter;
  now?: () => number;
  getRunId?(run: AgentRun): string | undefined;
};

/** Что это: вход handleToolCall; зачем нужно: runner получает chat, model history, toolCall и run state; проблема: один сценарий обрабатывает полный lifecycle tool-call. */
export type ToolRunnerHandleParams = {
  chat: Chat;
  workingMessages: OpenRouterMessage[];
  toolCall: ToolCall;
  run: AgentRun;
  runId?: string;
};
