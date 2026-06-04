import { truncateText } from './truncateText';

/**
 * Что это: нормализует одну строку для git subject или PR title.
 * Зачем нужно: модель может вернуть Markdown, кавычки, точку в конце или слишком длинный текст.
 * Какую продуктовую проблему решает: reviewer видит аккуратный заголовок, а git commit не получает многострочный subject.
 */
export function sanitizeGitSubject({ value, fallback, maxLength }: { value: string; fallback: string; maxLength: number }): string {
  const normalized = value
    .replace(/^[-*#\s]+/g, '')
    .replace(/^['"`]+|['"`]+$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.。]+$/u, '')
    .trim();

  return truncateText({ value: normalized || fallback, maxLength });
}
