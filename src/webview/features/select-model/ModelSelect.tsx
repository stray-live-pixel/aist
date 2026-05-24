import { Check, ChevronDown, Cpu, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { vscode } from '../../shared/lib/vscode';
import type { ModelOption } from '../../shared/types';

type ModelSelectProps = {
  model: string;
  models: ModelOption[];
  disabled?: boolean;
};

export function ModelSelect({ model, models, disabled }: ModelSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = useMemo(
    () =>
      models.find((item) => item.id === model) || {
        id: model,
        name: model,
        provider: model.startsWith('codex:') ? 'codex' : 'openrouter',
        supportsTools: true
      },
    [model, models]
  );
  const options = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return normalizedQuery
      ? models.filter((item) =>
          `${item.name} ${item.id} ${getProviderLabel(item.provider)}`.toLowerCase().includes(normalizedQuery)
        )
      : models;
  }, [models, query]);
  const groups = useMemo(
    () =>
      [
        {
          provider: 'openrouter' as const,
          label: 'OpenRouter',
          options: options.filter((item) => (item.provider || 'openrouter') === 'openrouter')
        },
        {
          provider: 'codex' as const,
          label: 'ChatGPT Codex',
          options: options.filter((item) => item.provider === 'codex')
        }
      ].filter((group) => group.options.length),
    [options]
  );

  useEffect(() => {
    if (disabled) {
      setOpen(false);
      setQuery('');
    }
  }, [disabled]);

  useEffect(() => {
    if (!open) {
      return;
    }

    searchRef.current?.focus();

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function selectModel(nextModel: string) {
    vscode.postMessage({ type: 'setModel', model: nextModel });
    setOpen(false);
    setQuery('');
  }

  return (
    <div
      ref={rootRef}
      className="relative grid min-w-56 max-w-full gap-1 text-xs text-[var(--vscode-descriptionForeground)]"
    >
      <span className="flex items-center gap-2">
        <Cpu size={14} className="shrink-0" />
        <span>Model</span>
      </span>
      <button
        type="button"
        className="flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded border border-[var(--agent-input-border)] bg-[var(--vscode-dropdown-background)] px-2 text-left text-xs text-[var(--vscode-dropdown-foreground)] outline-none focus:border-[var(--vscode-focusBorder)] disabled:cursor-not-allowed disabled:opacity-[0.55]"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="min-w-0 flex-1 truncate">
          {selected.name} ({selected.id})
        </span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="absolute bottom-full left-0 z-20 mb-2 grid max-h-80 w-[min(32rem,calc(100vw-2rem))] gap-2 rounded-md border border-[var(--agent-border)] bg-[var(--vscode-dropdown-background)] p-2 shadow-lg">
          <div className="flex h-8 items-center gap-2 rounded border border-[var(--agent-input-border)] bg-[var(--vscode-input-background)] px-2 text-[var(--vscode-input-foreground)] focus-within:border-[var(--vscode-focusBorder)]">
            <Search size={14} className="shrink-0 text-[var(--vscode-descriptionForeground)]" />
            <input
              ref={searchRef}
              className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--vscode-input-placeholderForeground)]"
              placeholder="Search models..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="max-h-60 overflow-y-auto" role="listbox" aria-label="Models">
            {groups.length ? (
              groups.map((group) => (
                <div key={group.provider} className="grid gap-1">
                  <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase text-[var(--vscode-descriptionForeground)]">
                    {group.label}
                  </div>
                  {group.options.map((item) => {
                    const active = item.id === model;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`flex w-full min-w-0 items-start gap-2 rounded px-2 py-2 text-left text-xs outline-none hover:bg-[var(--vscode-list-hoverBackground)] focus:bg-[var(--vscode-list-focusBackground)] ${
                          active
                            ? 'bg-[var(--vscode-list-activeSelectionBackground)] text-[var(--vscode-list-activeSelectionForeground)]'
                            : ''
                        }`}
                        role="option"
                        aria-selected={active}
                        onClick={() => selectModel(item.id)}
                      >
                        <Check size={14} className={`mt-0.5 shrink-0 ${active ? 'opacity-100' : 'opacity-0'}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{item.name}</span>
                          <span
                            className={`block truncate ${active ? '' : 'text-[var(--vscode-descriptionForeground)]'}`}
                          >
                            {item.id}
                            {item.supportsTools ? '' : ' - no tools'}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            ) : (
              <div className="px-2 py-3 text-xs text-[var(--vscode-descriptionForeground)]">No models found</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getProviderLabel(provider: ModelOption['provider']): string {
  return provider === 'codex' ? 'ChatGPT Codex' : 'OpenRouter';
}
