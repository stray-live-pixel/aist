import path from 'node:path';

/**
 * Проверяет workspace-relative путь по простому glob-паттерну grep_search.
 *
 * Поддержка намеренно минимальная и сохраняет прежнее поведение инструмента:
 * *, **, ?, basename-совпадение для паттернов без slash и альтернативы вида
 * {one,two}. Этого достаточно для include/exclude без тяжёлых зависимостей.
 */
export function matchesGlob({ relativePath, pattern }: { relativePath: string; pattern: string }): boolean {
  const normalizedPath = relativePath.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/').replace(/^\/+/, '').trim();
  if (!normalizedPattern) {
    return false;
  }

  return expandGlobAlternatives({ pattern: normalizedPattern }).some((alternative) => {
    const regex = globToRegExp({ pattern: alternative });
    if (regex.test(normalizedPath)) {
      return true;
    }

    return !alternative.includes('/') && regex.test(path.basename(normalizedPath));
  });
}

/**
 * Разворачивает альтернативы верхнего уровня в glob-паттерне.
 *
 * Например, фигурная группа с ts и tsx масками превращается в два независимых паттерна. Вложенные
 * фигурные скобки не ломают разбор: запятая учитывается только на верхнем уровне.
 */
export function expandGlobAlternatives({ pattern }: { pattern: string }): string[] {
  const trimmed = pattern.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return [trimmed];
  }

  const body = trimmed.slice(1, -1);
  const alternatives: string[] = [];
  let current = '';
  let depth = 0;

  for (const char of body) {
    if (char === '{') {
      depth += 1;
      current += char;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      current += char;
      continue;
    }

    if (char === ',' && depth === 0) {
      if (current.trim()) {
        alternatives.push(current.trim());
      }
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    alternatives.push(current.trim());
  }

  return alternatives;
}

/**
 * Компилирует простой glob в RegExp.
 *
 * Функция закрыта внутри инструмента и не пытается заменить полноценный glob
 * engine: она только сохраняет прежний контракт grep_search без новой зависимости.
 */
function globToRegExp({ pattern }: { pattern: string }): RegExp {
  let source = '^';

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    const next = pattern[index + 1];
    const afterNext = pattern[index + 2];

    if (char === '*' && next === '*' && afterNext === '/') {
      source += '(?:.*/)?';
      index += 2;
      continue;
    }

    if (char === '*' && next === '*') {
      source += '.*';
      index += 1;
      continue;
    }

    if (char === '*') {
      source += '[^/]*';
      continue;
    }

    if (char === '?') {
      source += '[^/]';
      continue;
    }

    source += escapeRegExp({ value: char });
  }

  source += '$';
  return new RegExp(source);
}

/** Экранирует символы RegExp, чтобы обычный текст glob не стал регуляркой. */
function escapeRegExp({ value }: { value: string }): string {
  return value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}
