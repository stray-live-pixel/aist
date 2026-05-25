import { SendHorizontal, Square } from 'lucide-react';
import type { ReactNode } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

import { useI18n } from '../../shared/i18n';
import { vscode } from '../../shared/lib/vscode';
import { KeyboardShortcut } from '../../shared/ui';
import styles from './Composer.module.scss';

const MAX_TEXTAREA_HEIGHT = 300;
const DEFAULT_CONTINUE_PROMPT = 'Continue working. Continue with the current task';

type ComposerProps = {
  busy: boolean;
  floating?: boolean;
  settings?: ReactNode;
  footer?: ReactNode;
  notice?: ReactNode;
};

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
    vscode.postMessage({ type: 'ask', prompt: value });
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
              onClick={busy ? () => vscode.postMessage({ type: 'stop' }) : sendPrompt}
            >
              {busy ? <Square size={12} /> : <SendHorizontal size={15} />}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

function ComposerDivider() {
  return <div className={styles.divider} />;
}

function resizePromptField(textarea: HTMLTextAreaElement | null) {
  if (!textarea) {
    return;
  }

  textarea.style.height = 'auto';
  textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
}

function isMacLikePlatform(): boolean {
  const platform = navigator.platform || '';
  return /mac|iphone|ipad|ipod/i.test(platform);
}
