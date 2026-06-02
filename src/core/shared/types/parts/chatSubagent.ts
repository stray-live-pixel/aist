import type { ChatMessage } from './chatMessage';
import type { JsonValue } from './json';
import type { OpenRouterMessage } from './model';

export type SubagentKind = 'memory.analysis';
export type SubagentRunStatus = 'created' | 'running' | 'success' | 'error' | 'stopped';
export type SubagentRunMode = 'single_model_call' | 'agent_loop';

/**
 * Что это: persisted запуск дочернего субагента.
 * Зачем нужно: пользователь видит отдельную историю фонового помощника, а основной чат не смешивает её с model context.
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
  history: OpenRouterMessage[];
  result?: JsonValue;
  error?: string;
  includeResultInParentModelContext: boolean;
  startedAt: number;
  finishedAt?: number;
  updatedAt: number;
};

/**
 * Что это: компактная ссылка из parent chat message на дочерний запуск.
 * Зачем нужно: UI может открыть детали субагента, не добавляя его историю в основной model history.
 */
