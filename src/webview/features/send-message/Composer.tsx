import { Brain, Loader2, Send, Square, Wrench } from 'lucide-react';
import { useState } from 'react';
import { ModelSelect } from '../select-model/ModelSelect';
import { vscode } from '../../shared/lib/vscode';
import type { ModelOption, ReasoningEffort } from '../../shared/types';

type ComposerProps = {
  busy: boolean;
  model: string;
  models: ModelOption[];
  activity?: 'thinking' | 'waitingForApproval' | 'runningTool' | 'stopping';
  reasoningEffort: ReasoningEffort;
  toolsCount: number;
};

export function Composer({ busy, model, models, activity, reasoningEffort, toolsCount }: ComposerProps) {
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
        <div className="flex min-w-0 flex-wrap items-end gap-2">
          <ModelSelect model={model} models={models} disabled={busy} />
          <label className="grid min-w-36 gap-1 text-xs text-[var(--vscode-descriptionForeground)]">
            <span className="flex items-center gap-2">
              <Brain size={14} className="shrink-0" />
              <span>Reasoning</span>
            </span>
            <select
              className="h-8 rounded border border-[var(--agent-input-border)] bg-[var(--vscode-dropdown-background)] px-2 text-xs text-[var(--vscode-dropdown-foreground)] outline-none focus:border-[var(--vscode-focusBorder)] disabled:cursor-not-allowed disabled:opacity-[0.55]"
              value={reasoningEffort}
              disabled={busy}
              onChange={(event) =>
                vscode.postMessage({ type: 'setReasoningEffort', reasoningEffort: event.target.value as ReasoningEffort })
              }
            >
              <option value="auto">Auto</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <div className="flex h-8 min-w-0 items-center gap-1 pb-px text-xs text-[var(--vscode-descriptionForeground)]">
            <Wrench size={14} className="shrink-0" />
            <span className="truncate">{toolsCount} tools</span>
          </div>
          {busy ? (
            <div className="flex h-8 min-w-0 items-center gap-1 pb-px text-xs text-[var(--vscode-descriptionForeground)]">
              <Loader2 size={14} className="shrink-0 animate-spin" />
              <span className="truncate">{formatActivity(activity)}</span>
            </div>
          ) : null}
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

function formatActivity(activity: ComposerProps['activity']): string {
  switch (activity) {
    case 'waitingForApproval':
      return 'Waiting for approval';
    case 'runningTool':
      return 'Running tool';
    case 'stopping':
      return 'Stopping';
    default:
      return 'Model is thinking';
  }
}
