import { ArrowLeft, CheckCircle2, LogIn, LogOut, Plus } from 'lucide-react';
import { useState } from 'react';
import { AgentModeSelect } from '../../features/select-agent-mode/AgentModeSelect';
import { ToolPermissionSelect } from '../../features/configure-tool-permission/ToolPermissionSelect';
import { vscode } from '../../shared/lib/vscode';
import type { AgentLanguage, AgentMode, AgentModeId, ToolPermissionItem } from '../../shared/types';
import { IconButton } from '../../shared/ui/IconButton';

type PermissionsPageProps = {
  tools: ToolPermissionItem[];
  maxToolIterations: number;
  agentLanguage: AgentLanguage;
  agentMode: AgentModeId;
  agentModes: AgentMode[];
  codexAuthenticated: boolean;
  onBack(): void;
};

export function PermissionsPage({
  tools,
  maxToolIterations,
  agentLanguage,
  agentMode,
  agentModes,
  codexAuthenticated,
  onBack
}: PermissionsPageProps) {
  const activeMode = agentModes.find((mode) => mode.id === agentMode) || agentModes[0];
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newInstructions, setNewInstructions] = useState('');

  const handleAddMode = () => {
    const label = newLabel.trim();
    if (!label) return;
    vscode.postMessage({
      type: 'addAgentMode',
      label,
      instructions: newInstructions.trim()
    });
    setNewLabel('');
    setNewInstructions('');
    setAdding(false);
  };

  return (
    <div className="flex h-screen flex-col bg-[var(--vscode-editor-background)] text-[var(--vscode-foreground)]">
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto grid max-w-4xl gap-4">
          <div className="flex items-start gap-3">
            <IconButton title="Back to chat" onClick={onBack}>
              <ArrowLeft size={15} />
            </IconButton>
            <div>
              <h1 className="text-base font-semibold">Settings</h1>
              <p className="mt-1 text-sm leading-6 text-[var(--vscode-descriptionForeground)]">
                Configure agent limits and choose which tools require confirmation before they run.
              </p>
            </div>
          </div>

          <section className="message-card bg-[var(--vscode-input-background)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold">ChatGPT Codex</h2>
                <p className="mt-1 text-xs leading-5 text-[var(--vscode-descriptionForeground)]">
                  {codexAuthenticated
                    ? 'Authorization is active. Codex models are available in the model selector.'
                    : 'Authorize ChatGPT Codex to use codex:* models through chatgpt.com/backend-api/codex/responses.'}
                </p>
              </div>
              {codexAuthenticated ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="flex h-8 items-center gap-1.5 rounded border border-[var(--agent-input-border)] px-2 text-xs text-[var(--vscode-testing-iconPassed)]">
                    <CheckCircle2 size={14} />
                    Authorized
                  </span>
                  <button
                    className="flex h-8 items-center gap-1.5 rounded border border-[var(--agent-input-border)] bg-transparent px-3 text-xs text-[var(--vscode-descriptionForeground)] hover:opacity-80"
                    onClick={() => vscode.postMessage({ type: 'codexLogout' })}
                  >
                    <LogOut size={14} />
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  className="flex h-8 items-center gap-1.5 rounded bg-[var(--vscode-button-background)] px-3 text-xs font-medium text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)]"
                  onClick={() => vscode.postMessage({ type: 'codexLogin' })}
                >
                  <LogIn size={14} />
                  Authorize
                </button>
              )}
            </div>
          </section>

          <section className="message-card bg-[var(--vscode-input-background)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold">Tool iteration limit</h2>
                <p className="mt-1 text-xs leading-5 text-[var(--vscode-descriptionForeground)]">
                  Maximum model/tool-call turns per request. Set to 0 to run without a limit.
                </p>
              </div>
              <input
                className="h-8 w-32 rounded border border-[var(--agent-input-border)] bg-[var(--vscode-input-background)] px-2 text-xs text-[var(--vscode-input-foreground)] outline-none focus:border-[var(--vscode-focusBorder)]"
                type="number"
                min={0}
                step={1}
                value={maxToolIterations}
                onChange={(event) =>
                  vscode.postMessage({
                    type: 'setMaxToolIterations',
                    maxToolIterations: Math.max(0, Math.floor(Number(event.target.value) || 0))
                  })
                }
              />
            </div>
          </section>

          <section className="message-card bg-[var(--vscode-input-background)]">
            <div className="grid gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold">Language</h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--vscode-descriptionForeground)]">
                    Controls agent answers and tool-call explanations.
                  </p>
                </div>
                <select
                  className="h-8 w-40 rounded border border-[var(--agent-input-border)] bg-[var(--vscode-dropdown-background)] px-2 text-xs text-[var(--vscode-dropdown-foreground)] outline-none focus:border-[var(--vscode-focusBorder)]"
                  value={agentLanguage}
                  onChange={(event) =>
                    vscode.postMessage({ type: 'setAgentLanguage', language: event.target.value as AgentLanguage })
                  }
                >
                  <option value="ru">Русский</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </section>

          <section className="message-card bg-[var(--vscode-input-background)]">
            <div className="grid gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold">Agent mode</h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--vscode-descriptionForeground)]">
                    Select a working mode and edit the instructions applied to chats.
                  </p>
                </div>
                <AgentModeSelect modes={agentModes} activeId={agentMode} className="w-52" />
              </div>
              {activeMode ? (
                <textarea
                  className="min-h-32 w-full resize-y rounded border border-[var(--agent-input-border)] bg-[var(--vscode-input-background)] px-2 py-2 text-xs text-[var(--vscode-input-foreground)] outline-none placeholder:text-[var(--vscode-input-placeholderForeground)] focus:border-[var(--vscode-focusBorder)]"
                  value={activeMode.instructions}
                  onChange={(event) =>
                    vscode.postMessage({
                      type: 'setAgentModeInstructions',
                      modeId: activeMode.id,
                      instructions: event.target.value
                    })
                  }
                />
              ) : null}

              {adding ? (
                <div className="grid gap-2 rounded border border-[var(--agent-input-border)] p-3">
                  <input
                    className="h-8 rounded border border-[var(--agent-input-border)] bg-[var(--vscode-input-background)] px-2 text-xs text-[var(--vscode-input-foreground)] outline-none placeholder:text-[var(--vscode-input-placeholderForeground)] focus:border-[var(--vscode-focusBorder)]"
                    placeholder="Mode name (e.g. Expert)"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    autoFocus
                  />
                  <textarea
                    className="min-h-24 w-full resize-y rounded border border-[var(--agent-input-border)] bg-[var(--vscode-input-background)] px-2 py-2 text-xs text-[var(--vscode-input-foreground)] outline-none placeholder:text-[var(--vscode-input-placeholderForeground)] focus:border-[var(--vscode-focusBorder)]"
                    placeholder="Instructions for this mode..."
                    value={newInstructions}
                    onChange={(e) => setNewInstructions(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      className="h-7 rounded bg-[var(--vscode-button-background)] px-3 text-xs font-medium text-[var(--vscode-button-foreground)] hover:opacity-90 disabled:opacity-50"
                      disabled={!newLabel.trim()}
                      onClick={handleAddMode}
                    >
                      Add
                    </button>
                    <button
                      className="h-7 rounded bg-transparent px-3 text-xs text-[var(--vscode-descriptionForeground)] hover:opacity-80"
                      onClick={() => {
                        setAdding(false);
                        setNewLabel('');
                        setNewInstructions('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="flex h-8 items-center justify-center gap-1.5 rounded border border-dashed border-[var(--agent-input-border)] bg-transparent text-xs text-[var(--vscode-descriptionForeground)] hover:border-solid hover:opacity-80"
                  onClick={() => setAdding(true)}
                >
                  <Plus size={14} />
                  Add mode
                </button>
              )}
            </div>
          </section>

          <div className="grid gap-3">
            {tools.map((tool) => (
              <ToolPermissionSelect key={tool.name} item={tool} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
