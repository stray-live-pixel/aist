import { removeUndefined } from '../../../shared/lib/fileRepository';
import type { ChatUsageEstimate } from '../../../shared/types/types';

/**
 * Что это: приводит usage запуска к безопасному числовому формату.
 * Зачем нужно: UI и telemetry ожидают нули вместо отсутствующих токенов.
 * Какую проблему решает: неконсистентные partial usage не ломают список запусков и агрегаты.
 */
export function normalizeRunUsage({ usage }: { usage: Partial<ChatUsageEstimate> }): ChatUsageEstimate {
  return removeUndefined({
    promptTokens: usage.promptTokens || 0,
    completionTokens: usage.completionTokens || 0,
    totalTokens: usage.totalTokens || 0,
    costUsd: usage.costUsd
  });
}
