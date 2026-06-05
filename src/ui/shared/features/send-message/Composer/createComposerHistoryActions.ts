import type { KeyboardEvent, MutableRefObject } from 'react';

import type { PromptHistoryItem } from '../promptHistory';
import { loadPromptHistory } from '../promptHistory';

/**
 * Что это: сценарии modal history и навигации стрелками по прошлым prompt.
 * Зачем нужно: пользователь может переиспользовать запросы без ручного копирования из чата.
 * Какую продуктовую проблему решает: draft не теряется при просмотре истории, а Enter/стрелки ведут себя предсказуемо.
 */
export function useComposerHistoryActions({
  chatId,
  getPrompt,
  getHistory,
  historyIndexRef,
  draftBeforeHistoryRef,
  setHistory,
  setHistoryOpen,
  applyPrompt,
  sendPrompt
}: {
  chatId: string;
  getPrompt: () => string;
  getHistory: () => PromptHistoryItem[];
  historyIndexRef: MutableRefObject<number | null>;
  draftBeforeHistoryRef: MutableRefObject<string>;
  setHistory: React.Dispatch<React.SetStateAction<PromptHistoryItem[]>>;
  setHistoryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  applyPrompt: (value: string) => void;
  sendPrompt: () => void;
}) {
  /** Открывает history modal с актуальным snapshot истории. */
  function openHistory() {
    setHistory(loadPromptHistory(chatId));
    setHistoryOpen(true);
  }

  /** Выбирает prompt из history modal. */
  function selectHistoryPrompt(value: string) {
    historyIndexRef.current = null;
    draftBeforeHistoryRef.current = value;
    applyPrompt(value);
    setHistoryOpen(false);
  }

  /** Обрабатывает shortcut отправки и стрелки истории внутри textarea. */
  function handlePromptKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      sendPrompt();
      return;
    }
    if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;

    const target = event.currentTarget;
    const selectionStart = target.selectionStart ?? 0;
    const selectionEnd = target.selectionEnd ?? selectionStart;
    const cursorAtStart = selectionStart === 0 && selectionEnd === 0;
    const cursorAtEnd = selectionStart === target.value.length && selectionEnd === target.value.length;
    if (event.key === 'ArrowUp' && (target.value.length === 0 || cursorAtStart)) {
      event.preventDefault();
      navigateHistory({ direction: 'older' });
      return;
    }
    if (event.key === 'ArrowDown' && (target.value.length === 0 || cursorAtEnd)) {
      event.preventDefault();
      navigateHistory({ direction: 'newer' });
    }
  }

  return { openHistory, closeHistory: () => setHistoryOpen(false), selectHistoryPrompt, handlePromptKeyDown };

  /** Навигация по prompt history стрелками вверх/вниз. */
  function navigateHistory({ direction }: { direction: 'older' | 'newer' }) {
    const history = getHistory();
    if (!history.length) return;
    if (direction === 'older') {
      const nextIndex =
        historyIndexRef.current === null ? 0 : Math.min(historyIndexRef.current + 1, history.length - 1);
      if (historyIndexRef.current === null) draftBeforeHistoryRef.current = getPrompt();
      historyIndexRef.current = nextIndex;
      applyPrompt(history[nextIndex].prompt);
      return;
    }
    if (historyIndexRef.current === null) return;
    const nextIndex = historyIndexRef.current - 1;
    if (nextIndex < 0) {
      historyIndexRef.current = null;
      applyPrompt(draftBeforeHistoryRef.current);
      return;
    }
    historyIndexRef.current = nextIndex;
    applyPrompt(history[nextIndex].prompt);
  }
}
