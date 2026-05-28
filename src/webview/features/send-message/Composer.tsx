import { SendHorizontal, Square } from 'lucide-react';
import { type ReactNode, type Ref, useLayoutEffect, useRef, useState } from 'react';

import { useI18n } from '../../shared/i18n';
import { agentActions } from '../../shared/lib/agentActions';
import { Button, ComposerFrame, KeyboardShortcut, TextArea } from '../../shared/ui';
import styles from './Composer.module.scss';
import type { ComposerProps } from './types';
import { DEFAULT_CONTINUE_PROMPT, isMacLikePlatform, resizePromptField } from './utils';

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
export function Composer({ chatId, busy, floating = false, settings, footer, notice }: ComposerProps) {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState('');
  const [sentComposer, setSentComposer] = useState<SentComposerSnapshot | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const animationIdRef = useRef(0);

  useLayoutEffect(() => {
    resizePromptField(textareaRef.current);
  }, [prompt]);

  function sendPrompt() {
    if (busy) {
      return;
    }

    const value = prompt.trim() || DEFAULT_CONTINUE_PROMPT;
    const nextAnimationId = animationIdRef.current + 1;
    animationIdRef.current = nextAnimationId;
    setSentComposer({ id: nextAnimationId, prompt: value });
    setPrompt('');
    window.setTimeout(() => {
      setSentComposer((current) => (current?.id === nextAnimationId ? null : current));
    }, COMPOSER_TRANSITION_MS);
    agentActions.ask(value);
  }

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
        onClick={busy ? () => agentActions.stop(chatId) : sendPrompt}
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
          settings={settings}
          footer={footer}
          notice={notice}
          fallback={t('composer.noSettings')}
          placeholder={t('composer.placeholder')}
          prompt={sentComposer.prompt}
          actions={actions}
          className={styles.composerExit}
          readOnly
        />
      ) : null}
      <ComposerShell
        busy={busy}
        floating={floating}
        settings={settings}
        footer={footer}
        notice={notice}
        fallback={t('composer.noSettings')}
        placeholder={t('composer.placeholder')}
        prompt={prompt}
        actions={actions}
        className={sentComposer ? styles.composerEnter : undefined}
        textareaRef={textareaRef}
        onPromptChange={setPrompt}
        onSendPrompt={sendPrompt}
      />
    </>
  );
}

function ComposerShell({
  floating,
  settings,
  footer,
  notice,
  fallback,
  placeholder,
  prompt,
  actions,
  className,
  textareaRef,
  readOnly,
  onPromptChange,
  onSendPrompt
}: {
  busy: boolean;
  floating: boolean;
  settings?: ReactNode;
  footer?: ReactNode;
  notice?: ReactNode;
  fallback: string;
  placeholder: string;
  prompt: string;
  actions: ReactNode;
  className?: string;
  textareaRef?: Ref<HTMLTextAreaElement>;
  readOnly?: boolean;
  onPromptChange?(value: string): void;
  onSendPrompt?(): void;
}) {
  return (
    <ComposerFrame
      floating={floating}
      notice={notice}
      header={settings}
      fallback={fallback}
      className={className}
      input={
        <TextArea
          ref={textareaRef}
          variant="composer"
          placeholder={placeholder}
          rows={1}
          value={prompt}
          readOnly={readOnly}
          aria-hidden={readOnly}
          tabIndex={readOnly ? -1 : undefined}
          onChange={(event) => onPromptChange?.(event.target.value)}
          onKeyDown={(event) => {
            if (!readOnly && (event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              onSendPrompt?.();
            }
          }}
        />
      }
      footer={footer}
      actions={actions}
    />
  );
}
