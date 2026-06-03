/**
 * Что это: безопасно укорачивает пользовательский или модельный текст до заданного лимита.
 * Зачем нужно: commit message, PR title и prompt для auxiliary model должны оставаться компактными.
 * Какую продуктовую проблему решает: длинные задачи агента не ломают git/gh команды и остаются читаемыми в review.
 */
export function truncateText({ value, maxLength }: { value: string; maxLength: number }): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
