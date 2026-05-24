import { SendHorizontal, Square } from 'lucide-react';
import type { ReactNode } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

import { vscode } from '../../shared/lib/vscode';
import styles from './Composer.module.scss';

const MAX_TEXTAREA_HEIGHT = 300;

type ComposerProps = {
  busy: boolean;
  floating?: boolean;
  settings?: ReactNode;
};

export function Composer({ busy, floating = false, settings }: ComposerProps) {
  const [prompt, setPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = Boolean(prompt.trim()) && !busy;

  useLayoutEffect(() => {
    resizePromptField(textareaRef.current);
  }, [prompt]);

  function sendPrompt() {
    const value = prompt.trim();
    if (!value || busy) {
      return;
    }

    setPrompt('');
    vscode.postMessage({ type: 'ask', prompt: value });
  }

  return (
    <footer className={floating ? `${styles.root} ${styles.floatingRoot}` : styles.root}>
      <div className={styles.panel}>
        <div className={styles.settings}>
          {settings ? settings : <span className={styles.settingsFallback}>Agent settings are not selected</span>}
        </div>
        <ComposerDivider />
        <textarea
          ref={textareaRef}
          className={styles.prompt}
          placeholder="Ask the agent to inspect, create, edit, or delete workspace files..."
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
          <span className={styles.hint}>⌘/Ctrl + Enter to send</span>
          <button
            className={styles.button}
            disabled={!busy && !canSend}
            title={busy ? 'Stop' : 'Send'}
            aria-label={busy ? 'Stop generation' : 'Send message'}
            onClick={busy ? () => vscode.postMessage({ type: 'stop' }) : sendPrompt}
          >
            {busy ? <Square size={12} /> : <SendHorizontal size={15} />}
          </button>
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
