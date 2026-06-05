import type { MutableRefObject, RefObject } from 'react';

import { agentActions } from '../../../shared/lib/agentActions';
import type { AgentAttachment } from '../../../shared/types';
import { addPromptToHistory, loadPromptDraft, loadPromptHistory, savePromptDraft } from '../promptHistory';
import type { ComposerProps } from '../types';
import { DEFAULT_ATTACHMENT_ANALYSIS_PROMPT, DEFAULT_CONTINUE_PROMPT } from '../utils';
import { COMPOSER_TRANSITION_MS } from './COMPOSER_TRANSITION_MS';
import type { SentComposerSnapshot } from './SentComposerSnapshot';

/**
 * Что это: сценарии ручного ввода, отправки prompt и stop-команды Composer.
 * Зачем нужно: главный hook не смешивает React-состояние с бизнес-правилами отправки в агент.
 * Какую продуктовую проблему решает: continue, prompt-only и attachment-only сценарии отправляются одинаково из webview и тестов.
 */
export function useComposerPromptActions({
  chatId,
  busy,
  onSubmitPrompt,
  onStopRequested,
  getPrompt,
  getAttachments,
  textareaRef,
  animationIdRef,
  historyIndexRef,
  draftBeforeHistoryRef,
  setPrompt,
  setAttachments,
  setAttachmentError,
  setHistory,
  setSentComposer
}: {
  chatId: string;
  busy: boolean;
  onSubmitPrompt: ComposerProps['onSubmitPrompt'];
  onStopRequested: ComposerProps['onStopRequested'];
  getPrompt: () => string;
  getAttachments: () => AgentAttachment[];
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  animationIdRef: MutableRefObject<number>;
  historyIndexRef: MutableRefObject<number | null>;
  draftBeforeHistoryRef: MutableRefObject<string>;
  setPrompt: (value: string) => void;
  setAttachments: React.Dispatch<React.SetStateAction<AgentAttachment[]>>;
  setAttachmentError: React.Dispatch<React.SetStateAction<string | undefined>>;
  setHistory: React.Dispatch<React.SetStateAction<ReturnType<typeof loadPromptHistory>>>;
  setSentComposer: React.Dispatch<React.SetStateAction<SentComposerSnapshot | null>>;
}) {
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
  function submitPrompt(
    value: string,
    options: { continueWithoutUserPrompt?: boolean; attachments?: AgentAttachment[] } = {}
  ) {
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

  /** Отправляет текущий prompt, вложения или continue-сценарий для полностью пустого ввода. */
  function sendPrompt() {
    if (busy) return;
    const typedPrompt = getPrompt().trim();
    const currentAttachments = getAttachments();
    if (!typedPrompt && currentAttachments.length === 0) {
      submitPrompt(DEFAULT_CONTINUE_PROMPT, { continueWithoutUserPrompt: true });
      return;
    }

    const promptForModel = typedPrompt || DEFAULT_ATTACHMENT_ANALYSIS_PROMPT;
    const nextAnimationId = animationIdRef.current + 1;
    animationIdRef.current = nextAnimationId;
    setSentComposer({ id: nextAnimationId, prompt: typedPrompt, attachments: currentAttachments });
    setPrompt('');
    setAttachments([]);
    setAttachmentError(undefined);
    savePromptDraft(chatId, '');
    if (typedPrompt) {
      addPromptToHistory(chatId, typedPrompt);
    }
    setHistory(loadPromptHistory(chatId));
    historyIndexRef.current = null;
    draftBeforeHistoryRef.current = '';
    window.setTimeout(() => {
      setSentComposer((current) => (current?.id === nextAnimationId ? null : current));
    }, COMPOSER_TRANSITION_MS);
    submitPrompt(promptForModel, { attachments: currentAttachments });
  }

  return {
    updatePrompt,
    applyPrompt,
    sendPrompt,
    requestStop,
    resetChatDraft
  };

  /** Синхронизирует controller с новым chatId и очищает временные вложения старого чата. */
  function resetChatDraft({ nextChatId }: { nextChatId: string }) {
    const draft = loadPromptDraft(nextChatId);
    setPrompt(draft);
    setAttachments([]);
    setAttachmentError(undefined);
    setHistory(loadPromptHistory(nextChatId));
    historyIndexRef.current = null;
    draftBeforeHistoryRef.current = draft;
  }
}
