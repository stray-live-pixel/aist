import { createToolError, getErrorMessage } from '../../../shared/lib/toolErrors';

/**
 * Создаёт функцию проверки одной строки для grep_search.
 *
 * В обычном режиме ищем подстроку, в regex-режиме компилируем регулярное
 * выражение. При невалидной регулярке пользователь получает структурированную
 * ошибку INVALID_ARGUMENT с исходным query.
 */
export function createLineMatcher({
  query,
  useRegex,
  caseSensitive
}: {
  query: string;
  useRegex: boolean;
  caseSensitive: boolean;
}): (line: string) => number | undefined {
  if (useRegex) {
    const flags = caseSensitive ? '' : 'i';
    let regex: RegExp;
    try {
      regex = new RegExp(query, flags);
    } catch (error) {
      throw createToolError('INVALID_ARGUMENT', `Invalid grep_search regex: ${getErrorMessage(error)}`, { query });
    }

    return (line) => {
      const match = regex.exec(line);
      return match ? match.index : undefined;
    };
  }

  const needle = caseSensitive ? query : query.toLocaleLowerCase();
  return (line) => {
    const haystack = caseSensitive ? line : line.toLocaleLowerCase();
    const index = haystack.indexOf(needle);
    return index === -1 ? undefined : index;
  };
}
