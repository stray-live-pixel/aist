import type { DragEvent } from 'react';

import { getShiftDropFullPaths, insertTextIntoPrompt } from '../utils';

/**
 * Что это: сценарии Shift-drag/drop абсолютных путей в textarea Composer.
 * Зачем нужно: обычный drag/drop браузера не ломается, а специальный drop путей работает только по Shift.
 * Какую продуктовую проблему решает: пользователь быстро добавляет пути файлов в prompt без ручного набора.
 */
export function useComposerDropActions({
  getPrompt,
  updatePrompt
}: {
  getPrompt: () => string;
  updatePrompt: (value: string) => void;
}) {
  /** Разрешает drop только для Shift-path сценария, не меняя обычное drag/drop поведение браузера. */
  function handlePromptDragOver(event: DragEvent<HTMLTextAreaElement>) {
    if (getShiftDropFullPaths({ dataTransfer: event.dataTransfer, shiftKey: event.shiftKey }).length > 0) {
      event.preventDefault();
    }
  }

  /** Вставляет Shift-dropped paths в текущую позицию курсора. */
  function handlePromptDrop(event: DragEvent<HTMLTextAreaElement>) {
    const prompt = getPrompt();
    const droppedPaths = getShiftDropFullPaths({ dataTransfer: event.dataTransfer, shiftKey: event.shiftKey });
    if (!droppedPaths.length) return;
    event.preventDefault();

    const target = event.currentTarget;
    const nextPrompt = insertTextIntoPrompt({
      value: prompt,
      text: droppedPaths.join('\n'),
      selectionStart: target.selectionStart ?? prompt.length,
      selectionEnd: target.selectionEnd ?? target.selectionStart ?? prompt.length
    });
    updatePrompt(nextPrompt.value);
    window.requestAnimationFrame(() => {
      target.focus();
      target.setSelectionRange(nextPrompt.cursorPosition, nextPrompt.cursorPosition);
    });
  }

  return { handlePromptDragOver, handlePromptDrop };
}
