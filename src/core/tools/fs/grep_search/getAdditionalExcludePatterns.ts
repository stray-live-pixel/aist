import { expandGlobAlternatives } from './matchesGlob';

/**
 * Достаёт пользовательские exclude-паттерны из аргументов grep_search.
 *
 * Если модель не передала строку или передала пустую строку, дополнительных
 * исключений нет. Паттерн с альтернативами разворачивается сразу, чтобы дальше
 * основной поиск работал с простым списком паттернов.
 */
export function getAdditionalExcludePatterns({ value }: { value: unknown }): string[] {
  if (typeof value !== 'string') {
    return [];
  }

  const pattern = value.trim();
  return pattern ? expandGlobAlternatives({ pattern }) : [];
}
