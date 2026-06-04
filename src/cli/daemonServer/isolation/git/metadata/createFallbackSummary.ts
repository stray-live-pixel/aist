import { truncateText } from '../utils/truncateText';

/**
 * Что это: создаёт Summary для PR body без модели.
 * Зачем нужно: fallback PR всё равно должен давать reviewer минимальный контекст изменений.
 * Какую продуктовую проблему решает: review остаётся возможным, даже если модельные метаданные недоступны.
 */
export function createFallbackSummary({
  prompt,
  fallbackAnswer,
  statusSummary
}: {
  prompt: string;
  fallbackAnswer?: string;
  statusSummary: string;
}): string {
  const answer = fallbackAnswer?.trim();
  if (answer) {
    return truncateText({ value: answer, maxLength: 1200 });
  }

  const status = statusSummary.trim();
  if (status) {
    return `Updated isolated branch files:\n\n${status}`;
  }

  return truncateText({ value: prompt.trim() || 'AIST isolated agent completed the requested task.', maxLength: 1200 });
}
