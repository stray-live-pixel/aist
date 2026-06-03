import type { CodexServiceTier, EditorContextMode, ModelProvider, ReasoningEffort } from './model';

export type ChatModelRequestPhase =
  | 'sending'
  | 'receiving'
  | 'streaming'
  | 'completed'
  | 'retrying'
  | 'failed'
  | 'aborted';

/**
 * Что это: настройки выполнения модели, сохранённые внутри конкретного чата.
 * Зачем нужно: каждый диалог может иметь собственную модель, reasoning и быстрые режимы без влияния на другие чаты.
 * Какую продуктовую проблему решает: пользователь переключает режим «без инструментов» только в текущем чате и не ломает параллельные диалоги.
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
