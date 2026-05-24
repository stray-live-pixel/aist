/**
 * Что это: пустое состояние истории сообщений.
 * Зачем нужно: объясняет пользователю, что агент готов работать, и показывает доступные инструменты.
 * Пример использования: <EmptyState tools={tools} />.
 */
import { Sparkles } from 'lucide-react';

import { getWebviewAssetUri } from '../../shared/lib/assets';
import { AistBrand } from '../../shared/ui/AistLogo';

type EmptyStateProps = {
  tools: string[];
};

export function EmptyState({ tools }: EmptyStateProps) {
  const hasLogo = Boolean(getWebviewAssetUri('logo'));

  return (
    <div className="grid gap-4 py-5">
      {hasLogo ? <AistBrand /> : <Sparkles className="mx-auto" size={100} />}
      <div className="grid gap-1 text-center">
        <h1 className="text-base font-semibold">Ready to work with your codebase</h1>
        <p className="text-sm text-[var(--vscode-descriptionForeground)]">
          Ask for a change, and the agent can inspect and modify files in this workspace.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {tools.map((tool) => (
          <span
            key={tool}
            className="rounded border border-[var(--agent-border)] px-2 py-1 text-xs text-[var(--vscode-descriptionForeground)]"
          >
            {tool}
          </span>
        ))}
      </div>
    </div>
  );
}
