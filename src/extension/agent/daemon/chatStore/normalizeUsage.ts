import type { ChatUsageEstimate } from '../../../chats/types';
import { EMPTY_USAGE } from './constants';

/**
 * Что это: приводит usage из daemon или local mutation к полному числовому формату.
 * Зачем нужно: persisted daemon state может не содержать все поля usage.
 * Какую проблему решает: summary и статистика чата не падают на undefined/NaN.
 */
export function normalizeUsage({ value }: { value: unknown }): ChatUsageEstimate {
  if (!value || typeof value !== 'object') {
    return { ...EMPTY_USAGE };
  }
  const usage = value as Partial<ChatUsageEstimate>;
  return {
    promptTokens: Number(usage.promptTokens) || 0,
    completionTokens: Number(usage.completionTokens) || 0,
    totalTokens: Number(usage.totalTokens) || 0,
    costUsd: typeof usage.costUsd === 'number' ? usage.costUsd : undefined
  };
}
