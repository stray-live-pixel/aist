import { Sparkles } from 'lucide-react';

type EmptyStateProps = {
  tools: string[];
};

export function EmptyState({ tools }: EmptyStateProps) {
  return (
    <div className="mx-auto grid max-w-4xl gap-4 py-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--agent-border)] bg-[var(--vscode-input-background)]">
          <Sparkles size={20} />
        </div>
        <div>
          <h1 className="text-base font-semibold">Ready to work with your codebase</h1>
          <p className="text-sm text-[var(--vscode-descriptionForeground)]">
            Ask for a change, and the agent can inspect and modify files in this workspace.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {tools.map((tool) => (
          <span key={tool} className="rounded border border-[var(--agent-border)] px-2 py-1 text-xs text-[var(--vscode-descriptionForeground)]">
            {tool}
          </span>
        ))}
      </div>
    </div>
  );
}
