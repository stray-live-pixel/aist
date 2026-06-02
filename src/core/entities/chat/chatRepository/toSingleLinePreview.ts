/**
 * Что это: короткий однострочный preview пользовательского текста.
 * Зачем нужно: заголовок и last message должны помещаться в списке чатов.
 * Какую продуктовую проблему решает: длинные многострочные запросы не ломают компактную историю диалогов.
 */
export function toSingleLinePreview({ value, maxLength }: { value: string; maxLength: number }): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}
