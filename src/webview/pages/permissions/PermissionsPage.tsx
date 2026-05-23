import { ArrowLeft } from 'lucide-react';
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
  onBack(): void;
};

export function PermissionsPage({ tools, maxToolIterations, agentLanguage, agentMode, agentModes, onBack }: PermissionsPageProps) {
  const activeMode = agentModes.find((mode) => mode.id === agentMode) || agentModes[0];

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
                <select
                  className="h-8 w-40 rounded border border-[var(--agent-input-border)] bg-[var(--vscode-dropdown-background)] px-2 text-xs text-[var(--vscode-dropdown-foreground)] outline-none focus:border-[var(--vscode-focusBorder)]"
                  value={agentMode}
                  onChange={(event) =>
                    vscode.postMessage({ type: 'setAgentMode', modeId: event.target.value as AgentModeId })
                  }
                >
                  {agentModes.map((mode) => (
                    <option key={mode.id} value={mode.id}>
                      {mode.label}
                    </option>
                  ))}
                </select>
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
