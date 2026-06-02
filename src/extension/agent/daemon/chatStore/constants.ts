import type { ChatUsageEstimate } from '../../../chats/types';

/**
 * Что это: нулевой usage для новых или очищенных чатов.
 * Зачем нужно: все токены должны иметь числовой fallback.
 * Какую проблему решает: UI не получает undefined при показе статистики токенов.
 */
export const EMPTY_USAGE: ChatUsageEstimate = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0
};
