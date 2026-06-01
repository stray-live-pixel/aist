import { ChevronUp, History, SendHorizontal, Square } from 'lucide-react';
import {
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react';

import { useI18n } from '../../shared/i18n';
import { agentActions } from '../../shared/lib/agentActions';
import { Button, CompactNavigationButton, ComposerFrame, KeyboardShortcut, TextArea } from '../../shared/ui';
import styles from './Composer.module.scss';
import { PromptHistoryModal } from './PromptHistoryModal';
import {
  type PromptHistoryItem,
  addPromptToHistory,
  loadPromptDraft,
  loadPromptHistory,
  savePromptDraft
} from './promptHistory';
import type { ComposerProps } from './types';
import {
  DEFAULT_CONTINUE_PROMPT,
  getShiftDropFullPaths,
  insertTextIntoPrompt,
  isMacLikePlatform,
  resizePromptField
} from './utils';

const COMPOSER_TRANSITION_MS = 500;

type SentComposerSnapshot = {
  /** Уникальный ключ нужен, чтобы React не переиспользовал exiting composer и CSS-анимация стартовала заново. */
  id: number;
  /** Текст, который пользователь отправил; показываем его в старом composer во время «улёта» в историю. */
  prompt: string;
};

/**
 * Что это: нижний composer для отправки prompt или остановки текущей генерации.
 * Зачем нужно: компонент инкапсулирует правила пустого prompt, shortcut и autosize textarea, а весь UI собирает из shared-компонентов.
 */
export function Composer({
  chatId,
  busy,
  floating = false,
  minimized = false,
  gradientWhileBusy = true,
  onSubmitPrompt,
  onStopRequested,
  settings,
  headerActions,
  footer,
  notice
}: ComposerProps) {
  const { t } = useI18n();
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

  function updatePrompt(value: string) {
    setPrompt(value);
    savePromptDraft(chatId, value);
    historyIndexRef.current = null;
    draftBeforeHistoryRef.current = value;
  }

  function applyPrompt(value: string) {
    setPrompt(value);
    savePromptDraft(chatId, value);
    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      textarea?.focus();
      textarea?.setSelectionRange(value.length, value.length);
    });
  }

  function submitPrompt(value: string, options: { continueWithoutUserPrompt?: boolean } = {}) {
    if (onSubmitPrompt) {
      onSubmitPrompt(value, options);
      return;
    }

    agentActions.ask(value, options);
  }

  function requestStop() {
    if (onStopRequested) {
      onStopRequested();
      return;
    }

    agentActions.stop(chatId);
  }

  function sendPrompt() {
    if (busy) {
      return;
    }

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

  function navigateHistory(direction: 'older' | 'newer') {
    if (history.length === 0) {
      return;
    }

    if (direction === 'older') {
      const nextIndex =
        historyIndexRef.current === null ? 0 : Math.min(historyIndexRef.current + 1, history.length - 1);

      if (historyIndexRef.current === null) {
        draftBeforeHistoryRef.current = prompt;
      }

      historyIndexRef.current = nextIndex;
      applyPrompt(history[nextIndex].prompt);
      return;
    }

    if (historyIndexRef.current === null) {
      return;
    }

    const nextIndex = historyIndexRef.current - 1;

    if (nextIndex < 0) {
      historyIndexRef.current = null;
      applyPrompt(draftBeforeHistoryRef.current);
      return;
    }

    historyIndexRef.current = nextIndex;
    applyPrompt(history[nextIndex].prompt);
  }

  function handlePromptKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      sendPrompt();
      return;
    }

    if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) {
      return;
    }

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

  function handlePromptDragOver(event: DragEvent<HTMLTextAreaElement>) {
    const droppedPaths = getShiftDropFullPaths({ dataTransfer: event.dataTransfer, shiftKey: event.shiftKey });

    if (droppedPaths.length === 0) {
      return;
    }

    // Разрешаем drop только для Shift-сценария, чтобы обычное поведение VS Code/браузера не менялось.
    event.preventDefault();
  }

  function handlePromptDrop(event: DragEvent<HTMLTextAreaElement>) {
    const droppedPaths = getShiftDropFullPaths({ dataTransfer: event.dataTransfer, shiftKey: event.shiftKey });

    if (droppedPaths.length === 0) {
      return;
    }

    event.preventDefault();

    const target = event.currentTarget;
    const selectionStart = target.selectionStart ?? prompt.length;
    const selectionEnd = target.selectionEnd ?? selectionStart;
    const insertedText = droppedPaths.join('\n');
    const nextPrompt = insertTextIntoPrompt({
      value: prompt,
      text: insertedText,
      selectionStart,
      selectionEnd
    });

    updatePrompt(nextPrompt.value);

    window.requestAnimationFrame(() => {
      target.focus();
      target.setSelectionRange(nextPrompt.cursorPosition, nextPrompt.cursorPosition);
    });
  }

  const composerHeaderActions = (
    <>
      <CompactNavigationButton
        icon={<History size={12} />}
        title={t('composer.history.open')}
        onClick={() => {
          setHistory(loadPromptHistory(chatId));
          setHistoryOpen(true);
        }}
      />
      {headerActions}
    </>
  );

  const actions = (
    <>
      <KeyboardShortcut label={t('composer.send')} keys={[isMacLikePlatform() ? '⌘' : 'Ctrl', '↵']} />
      <Button
        type="button"
        variant="tactile"
        size="sm"
        shape="round"
        iconOnly
        className={styles.sendButtonInstant}
        leadingIcon={busy ? <Square size={12} /> : <SendHorizontal size={15} />}
        title={busy ? t('composer.stop') : t('composer.send')}
        aria-label={busy ? t('composer.stopGeneration') : t('composer.sendMessage')}
        onClick={busy ? requestStop : sendPrompt}
      />
    </>
  );

  return (
    <>
      {sentComposer ? (
        <ComposerShell
          key={sentComposer.id}
          busy={busy}
          floating={floating}
          minimized={minimized}
          gradientWhileBusy={gradientWhileBusy}
          settings={settings}
          footer={footer}
          notice={notice}
          fallback={t('composer.noSettings')}
          placeholder={t('composer.placeholder')}
          prompt={sentComposer.prompt}
          headerActions={composerHeaderActions}
          actions={actions}
          className={styles.composerExit}
          readOnly
        />
      ) : null}
      <ComposerShell
        busy={busy}
        floating={floating}
        minimized={minimized}
        gradientWhileBusy={gradientWhileBusy}
        settings={settings}
        footer={footer}
        notice={notice}
        fallback={t('composer.noSettings')}
        placeholder={t('composer.placeholder')}
        prompt={prompt}
        headerActions={composerHeaderActions}
        actions={actions}
        className={sentComposer ? styles.composerEnter : undefined}
        textareaRef={textareaRef}
        onPromptChange={updatePrompt}
        onPromptKeyDown={handlePromptKeyDown}
        onPromptDragOver={handlePromptDragOver}
        onPromptDrop={handlePromptDrop}
      />
      {historyOpen ? (
        <PromptHistoryModal
          history={history}
          onClose={() => setHistoryOpen(false)}
          onSelect={(value) => {
            historyIndexRef.current = null;
            draftBeforeHistoryRef.current = value;
            applyPrompt(value);
            setHistoryOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function ComposerShell({
  busy,
  floating,
  minimized,
  gradientWhileBusy,
  settings,
  footer,
  notice,
  fallback,
  placeholder,
  prompt,
  headerActions,
  actions,
  className,
  textareaRef,
  readOnly,
  onPromptChange,
  onPromptKeyDown,
  onPromptDragOver,
  onPromptDrop
}: {
  busy: boolean;
  floating: boolean;
  minimized: boolean;
  gradientWhileBusy: boolean;
  settings?: ReactNode;
  footer?: ReactNode;
  notice?: ReactNode;
  fallback: string;
  placeholder: string;
  prompt: string;
  headerActions?: ReactNode;
  actions: ReactNode;
  className?: string;
  textareaRef?: Ref<HTMLTextAreaElement>;
  readOnly?: boolean;
  onPromptChange?(value: string): void;
  onPromptKeyDown?(event: KeyboardEvent<HTMLTextAreaElement>): void;
  onPromptDragOver?(event: DragEvent<HTMLTextAreaElement>): void;
  onPromptDrop?(event: DragEvent<HTMLTextAreaElement>): void;
}) {
  const shellClassName = [
    className,
    minimized ? styles.composerMinimized : undefined,
    minimized && busy && gradientWhileBusy ? styles.composerMinimizedBusyGradient : undefined
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={shellClassName || undefined} aria-expanded={!minimized}>
      <div className={styles.minimizedStrip} aria-hidden={!minimized}>
        <ChevronUp size={16} strokeWidth={2.4} />
      </div>
      <div className={styles.composerContent}>
        <ComposerFrame
          floating={floating}
          notice={notice}
          header={settings}
          headerActions={headerActions}
          fallback={fallback}
          input={
            <TextArea
              ref={textareaRef}
              variant="composer"
              placeholder={placeholder}
              rows={1}
              value={prompt}
              readOnly={readOnly}
              aria-hidden={readOnly || minimized}
              tabIndex={readOnly || minimized ? -1 : undefined}
              onChange={(event) => onPromptChange?.(event.target.value)}
              onKeyDown={(event) => {
                if (!readOnly) {
                  onPromptKeyDown?.(event);
                }
              }}
              onDragOver={(event) => {
                if (!readOnly) {
                  onPromptDragOver?.(event);
                }
              }}
              onDrop={(event) => {
                if (!readOnly) {
                  onPromptDrop?.(event);
                }
              }}
            />
          }
          footer={footer}
          actions={actions}
        />
      </div>
    </div>
  );
}
