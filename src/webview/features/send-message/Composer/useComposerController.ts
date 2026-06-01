import { type DragEvent, type KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { agentActions } from '../../../shared/lib/agentActions';
import {
  type PromptHistoryItem,
  addPromptToHistory,
  loadPromptDraft,
  loadPromptHistory,
  savePromptDraft
} from '../promptHistory';
import type { ComposerProps } from '../types';
import { DEFAULT_CONTINUE_PROMPT, getShiftDropFullPaths, insertTextIntoPrompt, resizePromptField } from '../utils';
import { COMPOSER_TRANSITION_MS } from './COMPOSER_TRANSITION_MS';
import type { SentComposerSnapshot } from './SentComposerSnapshot';

/**
 * Что это: controller hook для prompt draft, history, send/stop и drop-сценариев Composer.
 * Зачем нужно: UI-фасад Composer остаётся декларативным, а вся поведенческая логика хранится отдельно.
 * Какую продуктовую проблему решает: отправка prompt, continue, history navigation и Shift-drop путей не расходятся между render-слоями.
 */
export function useComposerController({
  chatId,
  busy,
  onSubmitPrompt,
  onStopRequested
}: Pick<ComposerProps, 'chatId' | 'busy' | 'onSubmitPrompt' | 'onStopRequested'>) {
  const [prompt, setPrompt] = useState(() => loadPromptDraft(chatId));
  const [history, setHistory] = useState<PromptHistoryItem[]>(() => loadPromptHistory(chatId));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sentComposer, setSentComposer] = useState<SentComposerSnapshot | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const animationIdRef = useRef(0);
  const historyIndexRef = useRef<number | null>(null);
  const draftBeforeHistoryRef = useRef('');

  useEffect(() => {
    const draft = loadPromptDraft(chatId);
    setPrompt(draft);
    setHistory(loadPromptHistory(chatId));
    historyIndexRef.current = null;
    draftBeforeHistoryRef.current = draft;
  }, [chatId]);

  useLayoutEffect(() => {
    resizePromptField(textareaRef.current);
  }, [prompt]);

  /** Обновляет prompt и draft storage после ручного ввода пользователя. */
  function updatePrompt(value: string) {
    setPrompt(value);
    savePromptDraft(chatId, value);
    historyIndexRef.current = null;
    draftBeforeHistoryRef.current = value;
  }

  /** Подставляет prompt программно и возвращает фокус/курсор в конец textarea. */
  function applyPrompt(value: string) {
    setPrompt(value);
    savePromptDraft(chatId, value);
    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      textarea?.focus();
      textarea?.setSelectionRange(value.length, value.length);
    });
  }

  /** Отправляет prompt через prop callback или общий agentActions fallback. */
  function submitPrompt(value: string, options: { continueWithoutUserPrompt?: boolean } = {}) {
    if (onSubmitPrompt) {
      onSubmitPrompt(value, options);
      return;
    }
    agentActions.ask(value, options);
  }

  /** Останавливает генерацию через prop callback или общий agentActions fallback. */
  function requestStop() {
    if (onStopRequested) {
      onStopRequested();
      return;
    }
    agentActions.stop(chatId);
  }

  /** Отправляет текущий prompt или continue-сценарий для пустого ввода. */
  function sendPrompt() {
    if (busy) return;
    const typedPrompt = prompt.trim();
    if (!typedPrompt) {
      submitPrompt(DEFAULT_CONTINUE_PROMPT, { continueWithoutUserPrompt: true });
      return;
    }

    const nextAnimationId = animationIdRef.current + 1;
    animationIdRef.current = nextAnimationId;
    setSentComposer({ id: nextAnimationId, prompt: typedPrompt });
    setPrompt('');
    savePromptDraft(chatId, '');
    addPromptToHistory(chatId, typedPrompt);
    setHistory(loadPromptHistory(chatId));
    historyIndexRef.current = null;
    draftBeforeHistoryRef.current = '';
    window.setTimeout(() => {
      setSentComposer((current) => (current?.id === nextAnimationId ? null : current));
    }, COMPOSER_TRANSITION_MS);
    submitPrompt(typedPrompt);
  }

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
      navigateHistory('older');
      return;
    }
    if (event.key === 'ArrowDown' && (target.value.length === 0 || cursorAtEnd)) {
      event.preventDefault();
      navigateHistory('newer');
    }
  }

  /** Разрешает drop только для Shift-path сценария, не меняя обычное drag/drop поведение браузера. */
  function handlePromptDragOver(event: DragEvent<HTMLTextAreaElement>) {
    if (getShiftDropFullPaths({ dataTransfer: event.dataTransfer, shiftKey: event.shiftKey }).length > 0) {
      event.preventDefault();
    }
  }

  /** Вставляет Shift-dropped paths в текущую позицию курсора. */
  function handlePromptDrop(event: DragEvent<HTMLTextAreaElement>) {
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

  return {
    prompt,
    history,
    historyOpen,
    sentComposer,
    textareaRef,
    updatePrompt,
    sendPrompt,
    requestStop,
    openHistory,
    closeHistory: () => setHistoryOpen(false),
    selectHistoryPrompt,
    handlePromptKeyDown,
    handlePromptDragOver,
    handlePromptDrop
  };

  /** Навигация по prompt history стрелками вверх/вниз. */
  function navigateHistory(direction: 'older' | 'newer') {
    if (!history.length) return;
    if (direction === 'older') {
      const nextIndex =
        historyIndexRef.current === null ? 0 : Math.min(historyIndexRef.current + 1, history.length - 1);
      if (historyIndexRef.current === null) draftBeforeHistoryRef.current = prompt;
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
