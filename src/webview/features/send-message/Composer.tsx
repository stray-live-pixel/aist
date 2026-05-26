import { SendHorizontal, Square } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';

import { useI18n } from '../../shared/i18n';
import { agentActions } from '../../shared/lib/agentActions';
import { Button, ComposerFrame, KeyboardShortcut, TextArea } from '../../shared/ui';
import type { ComposerProps } from './types';
import { DEFAULT_CONTINUE_PROMPT, isMacLikePlatform, resizePromptField } from './utils';

/**
 * Что это: нижний composer для отправки prompt или остановки текущей генерации.
 * Зачем нужно: компонент инкапсулирует правила пустого prompt, shortcut и autosize textarea, а весь UI собирает из shared-компонентов.
 */
export function Composer({ busy, floating = false, settings, footer, notice }: ComposerProps) {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    resizePromptField(textareaRef.current);
  }, [prompt]);

  function sendPrompt() {
    if (busy) {
      return;
    }

    const value = prompt.trim() || DEFAULT_CONTINUE_PROMPT;
    setPrompt('');
    agentActions.ask(value);
  }

  return (
    <ComposerFrame
      floating={floating}
      notice={notice}
      header={settings}
      fallback={t('composer.noSettings')}
      input={
        <TextArea
          ref={textareaRef}
          variant="composer"
          placeholder={t('composer.placeholder')}
          rows={1}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              sendPrompt();
            }
          }}
        />
      }
      footer={footer}
      actions={
        <>
          <KeyboardShortcut label={t('composer.send')} keys={[isMacLikePlatform() ? '⌘' : 'Ctrl', '↵']} />
          <Button
            type="button"
            variant="tactile"
            size="sm"
            shape="round"
            iconOnly
            leadingIcon={busy ? <Square size={12} /> : <SendHorizontal size={15} />}
            title={busy ? t('composer.stop') : t('composer.send')}
            aria-label={busy ? t('composer.stopGeneration') : t('composer.sendMessage')}
            onClick={busy ? agentActions.stop : sendPrompt}
          />
        </>
      }
    />
  );
}
