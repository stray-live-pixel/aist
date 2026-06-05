import type { PromptTextInsertion } from './dropTypes';

/**
 * Что это: вставляет текст в prompt вместо текущего выделения или прямо в позицию курсора.
 * Зачем нужно: Shift-drop файла должен вести себя как обычная текстовая вставка и не терять уже набранный prompt.
 */
export function insertTextIntoPrompt({
  value,
  text,
  selectionStart,
  selectionEnd
}: {
  value: string;
  text: string;
  selectionStart: number;
  selectionEnd: number;
}): PromptTextInsertion {
  // Страхуемся от некорректных selection значений, чтобы prompt не ломался на краях строки.
  const safeSelectionStart = clampTextPosition({ value, position: selectionStart });
  const safeSelectionEnd = clampTextPosition({ value, position: selectionEnd });
  const insertStart = Math.min(safeSelectionStart, safeSelectionEnd);
  const insertEnd = Math.max(safeSelectionStart, safeSelectionEnd);

  return {
    value: `${value.slice(0, insertStart)}${text}${value.slice(insertEnd)}`,
    cursorPosition: insertStart + text.length
  };
}

/**
 * Что это: приводит позицию курсора к границам prompt.
 * Зачем нужно: браузерные selection API обычно корректны, но тесты и будущие интеграции могут передать внешние значения.
 */
function clampTextPosition({ value, position }: { value: string; position: number }): number {
  if (!Number.isFinite(position)) {
    return value.length;
  }

  return Math.min(Math.max(position, 0), value.length);
}
