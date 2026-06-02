import type { ChatMessage } from './chat';

export type SubagentKind = 'memory.analysis';
export type SubagentRunStatus = 'created' | 'running' | 'success' | 'error' | 'stopped';
export type SubagentRunMode = 'single_model_call' | 'agent_loop';

/**
 * Что это: persisted запуск дочернего субагента для UI.
 * Зачем нужно: карточка в основном чате может открыть полную историю анализа без загрязнения основного контекста модели.
 */
export type SubagentRun = {
  id: string;
  parentChatId: string;
  kind: SubagentKind;
  mode: SubagentRunMode;
  title: string;
  status: SubagentRunStatus;
  model: string;
  messages: ChatMessage[];
  history: Array<Record<string, unknown>>;
  result?: unknown;
  error?: string;
  includeResultInParentModelContext: boolean;
  startedAt: number;
  finishedAt?: number;
  updatedAt: number;
};
