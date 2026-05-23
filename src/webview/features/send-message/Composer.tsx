import { ClipboardPaste, Loader2, Plus, Send, Trash2, Wrench } from 'lucide-react';
import { useState } from 'react';
import { ModelSelect } from '../select-model/ModelSelect';
import { vscode } from '../../shared/lib/vscode';
import { IconButton } from '../../shared/ui/IconButton';

type ComposerProps = {
  busy: boolean;
  model: string;
  models: string[];
  toolsCount: number;
};

export function Composer({ busy, model, models, toolsCount }: ComposerProps) {
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <ModelSelect model={model} models={models} disabled={busy} />
            <div className="flex min-w-0 items-center gap-1 text-xs text-[var(--vscode-descriptionForeground)]">
              <Wrench size={14} className="shrink-0" />
              <span className="truncate">{toolsCount} tools</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <IconButton title="New chat" disabled={busy} onClick={() => vscode.postMessage({ type: 'newChat' })}>
              <Plus size={15} />
            </IconButton>
            <IconButton title="Insert last answer" onClick={() => vscode.postMessage({ type: 'insertLastAnswer' })}>
              <ClipboardPaste size={15} />
            </IconButton>
            <IconButton title="Clear chat" disabled={busy} onClick={() => vscode.postMessage({ type: 'clear' })}>
              <Trash2 size={15} />
            </IconButton>
            <button className="primary-button" disabled={!canSend} onClick={sendPrompt}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
