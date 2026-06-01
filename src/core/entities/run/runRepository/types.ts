import type {
  AgentRunStatus,
  ChatUsageEstimate,
  JsonValue,
  RuntimeEvent,
  RuntimeToolCallSnapshot,
  RuntimeToolResult,
  ToolApprovalDecision,
  ToolApprovalRequest
} from '../../../shared/types/types';

/**
 * Что это: настройки file-backed репозитория запусков агента.
 * Зачем нужно: daemon и runtime используют один источник правды для путей, времени и id.
 * Какую проблему решает: тесты могут подменять фабрики, не меняя поведение production-хранилища.
 */
export type RunRepositoryOptions = {
  workspaceRoot: string;
  homeDir?: string;
  idFactory?: () => string;
  now?: () => number;
};

/**
 * Что это: входные данные для создания нового запуска агента.
 * Зачем нужно: runtime фиксирует старт run до первых событий модели и инструментов.
 * Какую проблему решает: история запусков остаётся восстанавливаемой после перезапуска daemon.
 */
export type CreateRunInput = {
  id?: string;
  chatId: string;
  prompt?: string;
  model?: string;
  status?: AgentRunStatus;
  startedAt?: number;
};

/**
 * Что это: частичное обновление метаданных run.
 * Зачем нужно: события runtime меняют статус, модель, usage и ошибку независимо.
 * Какую проблему решает: callers не перезаписывают весь meta.json ради одного поля.
 */
export type RunMetadataPatch = Partial<
  Pick<RunMetadata, 'chatId' | 'status' | 'prompt' | 'model' | 'startedAt' | 'finishedAt' | 'usage' | 'error'>
>;

/**
 * Что это: компактный снимок состояния запуска.
 * Зачем нужно: UI и daemon быстро показывают список run без replay jsonl-логов.
 * Какую проблему решает: meta.json остаётся быстрым индексом для восстановления статусов.
 */
export type RunMetadata = {
  schemaVersion: number;
  id: string;
  chatId: string;
  status: AgentRunStatus;
  prompt?: string;
  model?: string;
  startedAt: number;
  finishedAt?: number;
  updatedAt: number;
  usage?: ChatUsageEstimate;
  error?: { message: string; code?: string };
};

/**
 * Что это: append-only запись об approval для tool call.
 * Зачем нужно: пользовательские решения должны быть доступны для аудита и памяти агента.
 * Какую проблему решает: approval не теряется при обновлении meta.json.
 */
export type RunApprovalLogEntry = {
  id: string;
  runId: string;
  chatId?: string;
  approvalId?: string;
  messageId?: string;
  status?: 'requested' | ToolApprovalRequest['status'];
  approval?: ToolApprovalRequest;
  toolCall?: RuntimeToolCallSnapshot;
  decision?: ToolApprovalDecision;
  createdAt: number;
  resolvedAt?: number;
};

/**
 * Что это: входные данные для записи approval-события.
 * Зачем нужно: репозиторий сам добавляет runId, id и timestamp, чтобы callers не дублировали правила.
 * Какую проблему решает: структура approval-log остаётся консистентной для всех tool сценариев.
 */
export type RunApprovalInput = Omit<RunApprovalLogEntry, 'id' | 'runId' | 'createdAt'> &
  Partial<Pick<RunApprovalLogEntry, 'id' | 'createdAt'>>;

/**
 * Что это: append-only запись результата tool call.
 * Зачем нужно: полный результат нужен для аудита, а компактный modelResult — для контекста модели.
 * Какую проблему решает: большие outputs не теряются и не раздувают chat history.
 */
export type RunToolResultLogEntry = {
  id: string;
  runId: string;
  chatId?: string;
  messageId?: string;
  toolCall?: RuntimeToolCallSnapshot;
  result: RuntimeToolResult;
  modelResult?: RuntimeToolResult;
  createdAt: number;
};

/**
 * Что это: входные данные для записи результата инструмента.
 * Зачем нужно: репозиторий централизованно проставляет служебные поля log entry.
 * Какую проблему решает: tool runner не знает деталей файлового формата run-хранилища.
 */
export type RunToolResultInput = Omit<RunToolResultLogEntry, 'id' | 'runId' | 'createdAt'> &
  Partial<Pick<RunToolResultLogEntry, 'id' | 'createdAt'>>;

/**
 * Что это: полный run record для детального просмотра или восстановления.
 * Зачем нужно: объединяет meta, runtime events, approvals, tool-results и telemetry.
 * Какую проблему решает: потребителям не нужно знать набор файлов внутри run-каталога.
 */
export type RunRecord = {
  meta: RunMetadata;
  events: RuntimeEvent[];
  approvals: RunApprovalLogEntry[];
  toolResults: RunToolResultLogEntry[];
  telemetry?: JsonValue;
};
