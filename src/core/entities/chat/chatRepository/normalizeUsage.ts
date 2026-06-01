import { removeUndefined } from '../../../shared/lib/fileRepository';
import type { ChatUsageEstimate } from '../../../shared/types/types';

/**
 * Что это: нормализация статистики токенов и стоимости чата.
 * Зачем нужно: usage может приходить частично, но UI ждёт числовые поля.
 * Какую продуктовую проблему решает: карточка чата не показывает NaN/undefined вместо понятной статистики.
 */
export function normalizeUsage({ usage }: { usage: Partial<ChatUsageEstimate> | undefined }): ChatUsageEstimate {
  return removeUndefined({
    promptTokens: usage?.promptTokens || 0,
    completionTokens: usage?.completionTokens || 0,
    totalTokens: usage?.totalTokens || 0,
    costUsd: usage?.costUsd
  });
}
