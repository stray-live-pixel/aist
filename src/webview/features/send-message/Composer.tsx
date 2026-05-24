import { Send, Square } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { vscode } from '../../shared/lib/vscode';

type ComposerProps = {
  busy: boolean;
  settings?: ReactNode;
};

export function Composer({ busy, settings }: ComposerProps) {
  const [prompt, setPrompt] = useState('');
  const canSend = Boolean(prompt.trim()) && !busy;

  function sendPrompt() {
    const value = prompt.trim();
    if (!value || busy) {
      return;
    }

    setPrompt('');
    vscode.postMessage({ type: 'ask', prompt: value });
  }

  return (
    <footer className="border-t border-[var(--agent-border)] bg-[var(--vscode-sideBar-background)] p-3">
      <div className="mx-auto grid max-w-4xl gap-2">
        {settings ? <div className="min-w-0">{settings}</div> : null}
        <textarea
          className="min-h-24 w-full resize-y rounded-md border border-[var(--agent-input-border)] bg-[var(--vscode-input-background)] px-3 py-2 text-sm text-[var(--vscode-input-foreground)] outline-none placeholder:text-[var(--vscode-input-placeholderForeground)] focus:border-[var(--vscode-focusBorder)]"
          placeholder="Ask the agent to inspect, create, edit, or delete workspace files..."
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              sendPrompt();
            }
          }}
        />
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="text-xs text-[var(--vscode-descriptionForeground)]">⌘/Ctrl + Enter to send</span>
          <button
            className={busy ? 'secondary-button' : 'primary-button'}
            disabled={!busy && !canSend}
            onClick={busy ? () => vscode.postMessage({ type: 'stop' }) : sendPrompt}
          >
            {busy ? <Square size={14} /> : <Send size={16} />}
            <span>{busy ? 'Stop' : 'Send'}</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
