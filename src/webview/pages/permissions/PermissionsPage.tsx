import { ArrowLeft } from 'lucide-react';
import { ToolPermissionSelect } from '../../features/configure-tool-permission/ToolPermissionSelect';
import type { ToolPermissionItem } from '../../shared/types';
import { IconButton } from '../../shared/ui/IconButton';

type PermissionsPageProps = {
  tools: ToolPermissionItem[];
  onBack(): void;
};

export function PermissionsPage({ tools, onBack }: PermissionsPageProps) {
  return (
    <div className="flex h-screen flex-col bg-[var(--vscode-editor-background)] text-[var(--vscode-foreground)]">
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto grid max-w-4xl gap-4">
          <div className="flex items-start gap-3">
            <IconButton title="Back to chat" onClick={onBack}>
              <ArrowLeft size={15} />
            </IconButton>
            <div>
              <h1 className="text-base font-semibold">Tool permissions</h1>
              <p className="mt-1 text-sm leading-6 text-[var(--vscode-descriptionForeground)]">
                Choose which tools require confirmation before the agent can run them. Tool reasons are still saved in chat history for automatic calls.
              </p>
            </div>
          </div>

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
