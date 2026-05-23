import { ShieldCheck } from 'lucide-react';
import { vscode } from '../../shared/lib/vscode';
import type { ToolPermissionItem, ToolPermissionMode } from '../../shared/types';

type ToolPermissionSelectProps = {
  item: ToolPermissionItem;
};

export function ToolPermissionSelect({ item }: ToolPermissionSelectProps) {
  return (
    <article className="message-card bg-[var(--vscode-input-background)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck size={16} />
            <span>{item.name}</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--vscode-descriptionForeground)]">{item.description}</p>
          <p className="mt-1 text-xs text-[var(--vscode-descriptionForeground)]">Default: {formatPermission(item.defaultPermission)}</p>
        </div>
        <select
          className="w-48 rounded border border-[var(--agent-input-border)] bg-[var(--vscode-dropdown-background)] px-2 py-1 text-xs text-[var(--vscode-dropdown-foreground)] outline-none focus:border-[var(--vscode-focusBorder)]"
          value={item.permission}
          onChange={(event) =>
            vscode.postMessage({
              type: 'setToolPermission',
              toolName: item.name,
              permission: event.target.value as ToolPermissionMode
            })
          }
        >
          <option value="ask">Ask permission</option>
          <option value="auto">Run automatically</option>
        </select>
      </div>
    </article>
  );
}

function formatPermission(permission: ToolPermissionMode): string {
  return permission === 'auto' ? 'Run automatically' : 'Ask permission';
}
