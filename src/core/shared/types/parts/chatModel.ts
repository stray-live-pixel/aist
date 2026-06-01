import type { CodexServiceTier, EditorContextMode, ModelProvider, ReasoningEffort } from './model';

export type ChatModelRequestPhase =
  | 'sending'
  | 'receiving'
  | 'streaming'
  | 'completed'
  | 'retrying'
  | 'failed'
  | 'aborted';

export type ChatModelSettings = {
  model: string;
  reasoningEffort: ReasoningEffort;
  codexServiceTier: CodexServiceTier;
  maxToolIterations: number;
  editorContextMode: EditorContextMode;
  streamingEnabled: boolean;
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
