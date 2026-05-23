import { Cpu } from 'lucide-react';
import { vscode } from '../../shared/lib/vscode';

type ModelSelectProps = {
  model: string;
  models: string[];
  disabled?: boolean;
};

export function ModelSelect({ model, models, disabled }: ModelSelectProps) {
  return (
    <label className="flex min-w-0 items-center gap-2 text-xs text-[var(--vscode-descriptionForeground)]">
      <Cpu size={14} className="shrink-0" />
      <select
        className="min-w-0 max-w-72 rounded border border-[var(--agent-input-border)] bg-[var(--vscode-dropdown-background)] px-2 py-1 text-xs text-[var(--vscode-dropdown-foreground)] outline-none focus:border-[var(--vscode-focusBorder)]"
        value={model}
        disabled={disabled}
        onChange={(event) => vscode.postMessage({ type: 'setModel', model: event.target.value })}
      >
        {models.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}
