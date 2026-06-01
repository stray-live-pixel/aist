import type { ChatModelSettings, ChatUsageEstimate, ChatVcsState } from '../../../shared/types/types';

/**
 * Что это: persisted-метаданные чата в meta.json.
 * Зачем нужно: карточка чата быстро восстанавливается без чтения всей runtime-логики.
 * Какую продуктовую проблему решает: список и открытие чата остаются стабильными после перезапуска CLI/extension.
 */
export type StoredChatMeta = {
  schemaVersion: number;
  id: string;
  title: string;
  model: string;
  modelSettings?: ChatModelSettings;
  previousChatId?: string;
  compactedAt?: number;
  compactionModel?: string;
  vcs?: ChatVcsState;
  lastAnswer: string;
  usage: ChatUsageEstimate;
  createdAt: number;
  updatedAt: number;
};
