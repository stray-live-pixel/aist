import type { AuxiliaryModelInvoker } from '../../../entities/model/auxiliaryModel';
import type { ModelClient } from '../../../entities/model/modelTransport';
import type { AgentSkill } from '../../../features/skills/skills';
import type { ToolRegistry } from '../../../features/tool-execution/toolRegistry';
import type {
  ToolRunnerEventEmitter,
  ToolRunnerMutableContext,
  ToolRunnerRunRepository
} from '../../../features/tool-execution/toolRunner';
import type {
  AgentAttachment,
  AgentReflectionCandidate,
  AgentRun,
  Chat,
  ChatContextEstimate,
  ChatMessage,
  ChatPlan,
  ChatUsageEstimate,
  EditorContextInput,
  JsonValue,
  OpenRouterMessage,
  OpenRouterModelOption,
  RuntimeErrorInfo,
  RuntimeEvent,
  RuntimeRunSnapshot,
  ToolCall
} from '../../../shared/types/types';

/**
 * Что это: максимальное число попыток запроса модели за один запуск агента.
 * Зачем нужно: ограничивает retry-loop и защищает пользователя от бесконечных повторов при сетевых сбоях.
 * Какую продуктовую проблему решает: чат получает понятное завершение вместо зависшего запуска.
 */
export const MAX_MODEL_REQUEST_ATTEMPTS = 3;

/**
 * Что это: общий тип для синхронных и асинхронных adapter-методов runtime.
 * Зачем нужно: CLI, VS Code и тесты могут отдавать данные без лишнего Promise-оборачивания.
 * Какую продуктовую проблему решает: один runtime работает с разными окружениями без дублирования API.
 */
export type MaybePromise<T> = T | Promise<T>;

/**
 * Что это: снимок пользовательских настроек agent runtime на момент run.
 * Зачем нужно: model loop использует один согласованный набор лимитов и feature flags.
 * Какую продуктовую проблему решает: настройки не расходятся между UI, CLI и фактическим выполнением.
 */
export type AgentRuntimeConfigSnapshot = {
  maxToolIterations: number;
  streamingEnabled: boolean;
  /** Когда true, текущий чат делает быстрый model-only запрос без tool schemas и tool-loop. */
  toolsDisabled?: boolean;
  /** Когда true, schema инструментов не требует reason/nextStep и экономит токены на каждом tool-call. */
  toolCallNotesRequired?: boolean;
  disabledProjectToolIds?: readonly string[];
  auxiliaryModelToolEnabled?: boolean;
};

/**
 * Что это: результат попытки принять пользовательский запрос в работу.
 * Зачем нужно: UI/CLI сразу понимают, стартовал run или его нужно показать как ошибку.
 * Какую продуктовую проблему решает: busy/empty prompt сценарии не превращаются в скрытые исключения.
 */
export type AgentRuntimeRunResult = { accepted: true; runId: string } | { accepted: false; error: RuntimeErrorInfo };

/**
 * Что это: опции запуска вопроса пользователя.
 * Зачем нужно: internal-сценарии могут попросить модель без записи synthetic user message в чат.
 * Какую продуктовую проблему решает: история остаётся чистой для фоновых/служебных запросов.
 */
export type AgentRuntimeAskOptions = {
  /** Запустить модель с prompt как инструкцией, но не добавлять новый user message в чат/историю. */
  skipUserMessage?: boolean;
  /** Вложения пользователя, которые нужно показать в чате и передать модели для анализа. */
  attachments?: AgentAttachment[];
};

/**
 * Что это: итоговый статус telemetry для run.
 * Зачем нужно: аналитика различает успешные, ошибочные и остановленные пользователем запуски.
 * Какую продуктовую проблему решает: продуктовые метрики не смешивают отмены с поломками.
 */
export type AgentRuntimeTelemetryStatus = 'success' | 'error' | 'stopped';

/**
 * Что это: минимальный logger для runtime.
 * Зачем нужно: runtime пишет важные события без привязки к VS Code или CLI logger.
 * Какую продуктовую проблему решает: диагностика одинакова в разных окружениях.
 */
export type AgentRuntimeLogger = {
  info(message: string, details?: unknown): void;
  error?(message: string, error?: unknown): void;
};

/**
 * Что это: adapter хранилища чата, которым runtime меняет состояние диалога.
 * Зачем нужно: business-loop не знает, где лежат сообщения — в памяти, JSONL или extension store.
 * Какую продуктовую проблему решает: один агентский сценарий переиспользуется в тестах, CLI и VS Code.
 */
export type AgentRuntimeChatRepository = {
  getChat(chatId: string): MaybePromise<Chat | undefined>;
  appendMessage(chatId: string, message: Omit<ChatMessage, 'id' | 'createdAt'>): MaybePromise<ChatMessage>;
  updateMessage(
    chatId: string,
    messageId: string,
    patch: Partial<Omit<ChatMessage, 'id' | 'createdAt'>>
  ): MaybePromise<ChatMessage>;
  setBusy(chatId: string, busy: boolean): MaybePromise<void>;
  setActivity(chatId: string, activity: Chat['activity'], detail?: string): MaybePromise<void>;
  setActivityDetail(chatId: string, detail: string | undefined): MaybePromise<void>;
  setModelRequest(chatId: string, modelRequest: Chat['modelRequest']): MaybePromise<void>;
  updateModelRequest(
    chatId: string,
    patch: Partial<NonNullable<Chat['modelRequest']>>
  ): MaybePromise<Chat['modelRequest'] | undefined>;
  setHistory(chatId: string, history: Chat['history']): MaybePromise<void>;
  setLastAnswer(chatId: string, answer: string): MaybePromise<void>;
  addUsage(chatId: string, usage: Partial<ChatUsageEstimate>): MaybePromise<ChatUsageEstimate>;
  setContext(chatId: string, context: ChatContextEstimate | undefined): MaybePromise<void>;
  getActivePlan(chatId: string): ChatPlan | undefined;
  setActivePlan(chatId: string, activePlan: ChatPlan): MaybePromise<void>;
  addReflectionCandidates?(chatId: string, candidates: AgentReflectionCandidate[]): MaybePromise<void>;
};

/**
 * Что это: adapter журнала run-событий.
 * Зачем нужно: runtime сохраняет timeline запуска без знания конкретной реализации storage.
 * Какую продуктовую проблему решает: UI может восстановить ход выполнения после refresh/reconnect.
 */
export type AgentRuntimeRunRepository = ToolRunnerRunRepository & {
  create(input: {
    id?: string;
    chatId: string;
    prompt?: string;
    model?: string;
    status?: RuntimeRunSnapshot['status'];
    startedAt?: number;
  }): Promise<{ id: string }>;
  appendEvent(runId: string, event: RuntimeEvent): Promise<void>;
  setTelemetry?(runId: string, telemetry: JsonValue): Promise<void>;
};

/**
 * Что это: внешний подписчик runtime-событий.
 * Зачем нужно: VS Code webview и daemon получают live updates без чтения storage.
 * Какую продуктовую проблему решает: интерфейс показывает состояние агента сразу после события.
 */
export type AgentRuntimeEventSink = {
  emit(event: RuntimeEvent): MaybePromise<void>;
};

/**
 * Что это: provider системного промпта агента.
 * Зачем нужно: runtime не содержит prompt-текст и получает актуальную настройку перед запросом модели.
 * Какую продуктовую проблему решает: кастомизация агента не требует правки core loop.
 */
export type AgentRuntimePromptProvider = {
  getSystemPrompt(): MaybePromise<string>;
};

/**
 * Что это: набор источников контекста для ответа агента.
 * Зачем нужно: runtime подключает редактор, репозиторий и память через adapters.
 * Какую продуктовую проблему решает: ответ модели учитывает рабочую область без смешивания слоёв.
 */
export type AgentRuntimeContextProviders = {
  getEditorContext?(): MaybePromise<EditorContextInput | null | undefined>;
  getRepoContextNote?(prompt: string): MaybePromise<string | undefined>;
  getMemoryContextBlock?(input: { prompt: string; chat: Chat; signal?: AbortSignal }): MaybePromise<string | undefined>;
};

/**
 * Что это: каталог доступных моделей.
 * Зачем нужно: runtime узнаёт provider/pricing модели без прямой зависимости от конкретного списка.
 * Какую продуктовую проблему решает: расчёт usage и endpoint остаётся консистентным для разных окружений.
 */
export type AgentRuntimeModelCatalog = {
  getOption(modelId: string): OpenRouterModelOption | undefined;
};

/**
 * Что это: хуки продуктовой telemetry.
 * Зачем нужно: runtime фиксирует значимые этапы run без знания структуры telemetry объекта.
 * Какую продуктовую проблему решает: аналитика остаётся расширяемой и не засоряет business-loop.
 */
export type AgentRuntimeTelemetryHooks = {
  createRun?(chat: Chat, startedAt: number, runId: string): unknown;
  finalizeRun?(telemetry: unknown, status: AgentRuntimeTelemetryStatus): void;
  snapshot?(telemetry: unknown): JsonValue | undefined;
  recordContextBytes?(telemetry: unknown, bytes: number): void;
  recordModelRequest?(telemetry: unknown): void;
  recordModelUsage?(telemetry: unknown, usage: ChatUsageEstimate | undefined): void;
  recordToolCalls?(telemetry: unknown, toolNames: string[]): void;
  recordRepeatedToolCall?(telemetry: unknown): void;
};

/**
 * Что это: локализуемые тексты runtime activity.
 * Зачем нужно: продуктовые статусы в UI формируются централизованно.
 * Какую продуктовую проблему решает: разные этапы агента не показывают пользователю разнобойные сообщения.
 */
export type AgentRuntimeText = {
  prepareRequest(): string;
  requestModel(): string;
  requestModelAfterTools(iteration: number): string;
  retryModelRequest(attempt: number, maxAttempts: number): string;
  finalAnswer(): string;
  modelRequestedTools(count: number): string;
  stopRequested(): string;
  reasoning(text: string): string;
  answerDraft(text: string): string;
};

/**
 * Что это: параметры выполнения одного tool-call из model loop.
 * Зачем нужно: tool runner получает всё нужное состояние без доступа к приватным полям runtime.
 * Какую продуктовую проблему решает: approvals, события и история tool-call работают одинаково в UI и CLI.
 */
export type AgentRuntimeToolCallHandlerParams = {
  chat: Chat;
  workingMessages: OpenRouterMessage[];
  toolCall: ToolCall;
  run: AgentRun<unknown>;
  runId: string;
  context: ToolRunnerMutableContext;
  events: ToolRunnerEventEmitter;
  runRepository?: ToolRunnerRunRepository;
};

/**
 * Что это: handler запуска tool-call из runtime.
 * Зачем нужно: runtime делегирует approvals и исполнение инструментов специализированному feature-модулю.
 * Какую продуктовую проблему решает: loop модели не смешивается с деталями безопасности инструментов.
 */
export type AgentRuntimeToolCallHandler = (params: AgentRuntimeToolCallHandlerParams) => Promise<void>;

/**
 * Что это: полный набор зависимостей AgentRuntimeService.
 * Зачем нужно: constructor явно показывает все внешние adapters и hooks runtime.
 * Какую продуктовую проблему решает: core loop остаётся тестируемым и не привязанным к конкретному приложению.
 */
export type AgentRuntimeServiceDeps = {
  chatRepository: AgentRuntimeChatRepository;
  runRepository?: AgentRuntimeRunRepository;
  modelClient: ModelClient;
  auxiliaryModel?: AuxiliaryModelInvoker;
  toolRegistry: ToolRegistry;
  handleToolCall: AgentRuntimeToolCallHandler;
  configProvider: { getSnapshot(): MaybePromise<AgentRuntimeConfigSnapshot> };
  promptProvider: AgentRuntimePromptProvider;
  contextProviders?: AgentRuntimeContextProviders;
  modelCatalog?: AgentRuntimeModelCatalog;
  skillProvider?: { getSkills(): MaybePromise<readonly AgentSkill[]> };
  workspaceRootProvider?: { getWorkspaceRoot(): MaybePromise<string> };
  eventSink?: AgentRuntimeEventSink;
  concurrencyScope?: 'chat' | 'workspace';
  logger: AgentRuntimeLogger;
  reportError?(error: unknown, options?: { chatId?: string; context?: string; appendToChat?: boolean }): void;
  createErrorMessage?(content: string): Omit<ChatMessage, 'id' | 'createdAt'>;
  idFactory?: () => string;
  now?: () => number;
  text?: Partial<AgentRuntimeText>;
  telemetry?: AgentRuntimeTelemetryHooks;
  reflection?: {
    enabled?: boolean;
    timeoutMs?: number;
    schedule?(task: () => void): void;
  };
  hooks?: {
    onRunFinished?(result: {
      chatId: string;
      runId: string;
      status: AgentRuntimeTelemetryStatus;
      usage?: ChatUsageEstimate;
    }): MaybePromise<void>;
  };
};

/**
 * Что это: внутренний активный run, зарегистрированный в runtime.
 * Зачем нужно: stop/approval resolution быстро находят нужный AbortController и pending approvals.
 * Какую продуктовую проблему решает: пользователь может остановить запуск или ответить на approval без гонок.
 */
export type ActiveRun = {
  id: string;
  chatId: string;
  run: AgentRun<unknown>;
};
