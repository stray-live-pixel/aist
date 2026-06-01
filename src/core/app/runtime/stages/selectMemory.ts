/**
 * Что это: формирует результат видимого tool-call памяти.
 * Зачем нужно: пользователь и основная модель получают один источник правды о найденных заметках и правилах их применения.
 * Какую проблему решает: этап подбора памяти отделён от model loop и одинаково отображается в истории чата.
 */
export function createMemoryToolResult({ memoryNotes }: { memoryNotes: string }): Record<string, unknown> {
  const noteCount = countMemoryNotes({ memoryNotes });

  return {
    ok: true,
    source: 'user-approved-memory',
    found: noteCount > 0,
    noteCount,
    policy:
      'Use these notes only when they fit the current task. They are lower priority than system, developer, and explicit user instructions.',
    notes: memoryNotes
  };
}

/**
 * Что это: считает отдельные заметки в блоке памяти.
 * Зачем нужно: карточка tool-call может явно показать, нашёл ли memory-субагент полезный контекст.
 * Какую проблему решает: результат memory stage получает понятный found/noteCount без парсинга в UI.
 */
function countMemoryNotes({ memoryNotes }: { memoryNotes: string }): number {
  return memoryNotes
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- ')).length;
}
