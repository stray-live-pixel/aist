import { Cpu } from 'lucide-react';
import { useMemo, useState } from 'react';
import { vscode } from '../../shared/lib/vscode';
import type { ModelOption } from '../../shared/types';

type ModelSelectProps = {
  model: string;
  models: ModelOption[];
  disabled?: boolean;
};

export function ModelSelect({ model, models, disabled }: ModelSelectProps) {
  const [query, setQuery] = useState('');
  const options = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? models.filter((item) => `${item.name} ${item.id}`.toLowerCase().includes(normalizedQuery))
      : models;

    if (filtered.some((item) => item.id === model)) {
      return filtered;
    }

    const selected = models.find((item) => item.id === model) || {
      id: model,
      name: model,
      supportsTools: true
    };

    return [selected, ...filtered];
  }, [model, models, query]);

  return (
    <label className="grid min-w-56 gap-1 text-xs text-[var(--vscode-descriptionForeground)]">
      <span className="flex items-center gap-2">
        <Cpu size={14} className="shrink-0" />
        <span>Model</span>
      </span>
      <input
        className="w-full rounded border border-[var(--agent-input-border)] bg-[var(--vscode-input-background)] px-2 py-1 text-xs text-[var(--vscode-input-foreground)] outline-none placeholder:text-[var(--vscode-input-placeholderForeground)] focus:border-[var(--vscode-focusBorder)]"
        placeholder="Search OpenRouter models..."
        value={query}
        disabled={disabled}
        onChange={(event) => setQuery(event.target.value)}
      />
      <select
        className="w-full rounded border border-[var(--agent-input-border)] bg-[var(--vscode-dropdown-background)] px-2 py-1 text-xs text-[var(--vscode-dropdown-foreground)] outline-none focus:border-[var(--vscode-focusBorder)]"
        value={model}
        disabled={disabled}
        onChange={(event) => vscode.postMessage({ type: 'setModel', model: event.target.value })}
      >
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} ({item.id}){item.supportsTools ? '' : ' - no tools'}
          </option>
        ))}
      </select>
    </label>
  );
}
