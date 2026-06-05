import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { AgentAttachment } from '../../../shared/types';
import type { PromptHistoryItem } from '../promptHistory';
import { loadPromptDraft, loadPromptHistory } from '../promptHistory';
import { resizePromptField } from '../utils';
import type { ComposerControllerProps } from './ComposerControllerProps';
import type { SentComposerSnapshot } from './SentComposerSnapshot';
import { useComposerAttachmentActions } from './createComposerAttachmentActions';
import { useComposerDropActions } from './createComposerDropActions';
import { useComposerHistoryActions } from './createComposerHistoryActions';
import { useComposerPromptActions } from './createComposerPromptActions';

/**
 * Что это: controller hook для prompt draft, history, send/stop и drop-сценариев Composer.
 * Зачем нужно: UI-фасад Composer остаётся декларативным, а вся поведенческая логика хранится отдельно.
 * Какую продуктовую проблему решает: отправка prompt, continue, history navigation и Shift-drop путей не расходятся между render-слоями.
 */
export function useComposerController(props: ComposerControllerProps) {
  const { chatId, busy, onSubmitPrompt, onStopRequested } = props;
  const [prompt, setPrompt] = useState(() => loadPromptDraft(chatId));
  const [attachments, setAttachments] = useState<AgentAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | undefined>();
  const [history, setHistory] = useState<PromptHistoryItem[]>(() => loadPromptHistory(chatId));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sentComposer, setSentComposer] = useState<SentComposerSnapshot | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const animationIdRef = useRef(0);
  const historyIndexRef = useRef<number | null>(null);
  const draftBeforeHistoryRef = useRef('');

  const promptActions = useComposerPromptActions({
    chatId,
    busy,
    onSubmitPrompt,
    onStopRequested,
    getPrompt: () => prompt,
    getAttachments: () => attachments,
    textareaRef,
    animationIdRef,
    historyIndexRef,
    draftBeforeHistoryRef,
    setPrompt,
    setAttachments,
    setAttachmentError,
    setHistory,
    setSentComposer
  });
  const attachmentActions = useComposerAttachmentActions({ setAttachments, setAttachmentError });
  const historyActions = useComposerHistoryActions({
    chatId,
    getPrompt: () => prompt,
    getHistory: () => history,
    historyIndexRef,
    draftBeforeHistoryRef,
    setHistory,
    setHistoryOpen,
    applyPrompt: promptActions.applyPrompt,
    sendPrompt: promptActions.sendPrompt
  });
  const dropActions = useComposerDropActions({
    getPrompt: () => prompt,
    updatePrompt: promptActions.updatePrompt
  });

  useEffect(() => {
    promptActions.resetChatDraft({ nextChatId: chatId });
  }, [chatId]);

  useLayoutEffect(() => {
    resizePromptField(textareaRef.current);
  }, [prompt]);

  return {
    prompt,
    attachments,
    attachmentError,
    history,
    historyOpen,
    sentComposer,
    textareaRef,
    updatePrompt: promptActions.updatePrompt,
    sendPrompt: promptActions.sendPrompt,
    requestStop: promptActions.requestStop,
    addAttachmentsFromInput: attachmentActions.addAttachmentsFromInput,
    removeAttachment: attachmentActions.removeAttachment,
    openHistory: historyActions.openHistory,
    closeHistory: historyActions.closeHistory,
    selectHistoryPrompt: historyActions.selectHistoryPrompt,
    handlePromptKeyDown: historyActions.handlePromptKeyDown,
    handlePromptDragOver: dropActions.handlePromptDragOver,
    handlePromptDrop: dropActions.handlePromptDrop
  };
}
