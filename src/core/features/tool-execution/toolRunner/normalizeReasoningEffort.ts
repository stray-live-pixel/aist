/**
 * Что это: нормализует reasoningEffort для invoke_model tool.
 * Зачем нужно: аргументы модели могут содержать только поддерживаемые значения.
 * Какую продуктовую проблему решает: auxiliary model request не падает из-за неизвестного effort.
 */
export function normalizeReasoningEffort({
  value
}: {
  value: unknown;
}): 'auto' | 'low' | 'medium' | 'high' | 'xhigh' | undefined {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'xhigh' || value === 'auto'
    ? value
    : undefined;
}
