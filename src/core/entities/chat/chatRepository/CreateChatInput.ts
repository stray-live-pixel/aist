import type {
  ChatModelSettings,
  ChatUsageEstimate,
  ChatVcsState,
  OpenRouterMessage
} from '../../../shared/types/types';
import type { ChatMessageInput } from './ChatMessageInput';
import type { ChatStatePatch } from './ChatStatePatch';

/**
 * Что это: входные данные для создания нового persisted-чата.
 * Зачем нужно: CLI/runtime могут стартовать обычный чат, continuation или compacted-чат одним контрактом.
 * Какую продуктовую проблему решает: создание чата не расползается по разным форматам и не теряет историю.
 */
export type CreateChatInput = {
  id?: string;
  title?: string;
  model: string;
  modelSettings?: ChatModelSettings;
  previousChatId?: string;
  compactedAt?: number;
  compactionModel?: string;
  vcs?: ChatVcsState;
  lastAnswer?: string;
  usage?: Partial<ChatUsageEstimate>;
  messages?: ChatMessageInput[];
  history?: OpenRouterMessage[];
  state?: ChatStatePatch;
};
