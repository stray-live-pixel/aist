import { ArrowLeft } from 'lucide-react';
import { ToolPermissionSelect } from '../../features/configure-tool-permission/ToolPermissionSelect';
import { vscode } from '../../shared/lib/vscode';
import type { ToolPermissionItem } from '../../shared/types';
import { IconButton } from '../../shared/ui/IconButton';

type PermissionsPageProps = {
  tools: ToolPermissionItem[];
  maxToolIterations: number;
  onBack(): void;
};

export function PermissionsPage({ tools, maxToolIterations, onBack }: PermissionsPageProps) {
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
