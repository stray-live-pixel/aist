import { SendHorizontal, Square } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';

import { useI18n } from '../../shared/i18n';
import { agentActions } from '../../shared/lib/agentActions';
import { KeyboardShortcut } from '../../shared/ui';
import styles from './Composer.module.scss';
import type { ComposerProps } from './types';
import { DEFAULT_CONTINUE_PROMPT, isMacLikePlatform, resizePromptField } from './utils';

/**
 * Что это: нижний composer для отправки prompt или остановки текущей генерации.
 * Зачем нужно: компонент инкапсулирует правила пустого prompt, shortcut и autosize textarea, чтобы страницы чата не дублировали IPC-детали.
 */
export function Composer({ busy, floating = false, settings, footer, notice }: ComposerProps) {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = !busy;

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
    <footer className={floating ? `${styles.root} ${styles.floatingRoot}` : styles.root}>
      {notice ? <div className={styles.notice}>{notice}</div> : null}
      <div className={styles.panel}>
        <div className={styles.settings}>
          {settings ? settings : <span className={styles.settingsFallback}>{t('composer.noSettings')}</span>}
        </div>
        <ComposerDivider />
        <textarea
          ref={textareaRef}
          className={styles.prompt}
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
        <ComposerDivider />
        <div className={styles.actions}>
          <div className={styles.footer}>{footer}</div>
          <div className={styles.sendActions}>
            <KeyboardShortcut label={t('composer.send')} keys={[isMacLikePlatform() ? '⌘' : 'Ctrl', '↵']} />
            <button
              className={styles.button}
              disabled={!busy && !canSend}
              title={busy ? t('composer.stop') : t('composer.send')}
              aria-label={busy ? t('composer.stopGeneration') : t('composer.sendMessage')}
              onClick={busy ? agentActions.stop : sendPrompt}
            >
              {busy ? <Square size={12} /> : <SendHorizontal size={15} />}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

/**
 * Что это: приватный разделитель секций composer.
 * Зачем нужно: отдельный компонент сохраняет JSX читаемым, но не выносится в файл, потому что не имеет самостоятельного поведения или stories.
 */
function ComposerDivider() {
  return <div className={styles.divider} />;
}
