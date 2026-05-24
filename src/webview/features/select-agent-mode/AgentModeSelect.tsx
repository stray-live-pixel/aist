import { Check, ChevronDown, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { vscode } from '../../shared/lib/vscode';
import type { AgentMode, AgentModeId } from '../../shared/types';

const DEFAULT_MODE_IDS = new Set<AgentModeId>(['default', 'careful']);

type AgentModeSelectProps = {
  modes: AgentMode[];
  activeId: AgentModeId;
  className?: string;
};

export function AgentModeSelect({ modes, activeId, className }: AgentModeSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<AgentModeId | undefined>();

  const activeMode = modes.find((mode) => mode.id === activeId) || modes[0];

  useEffect(() => {
    if (!open) {
      setDeleteTargetId(undefined);
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (deleteTargetId && !modes.some((mode) => mode.id === deleteTargetId)) {
      setDeleteTargetId(undefined);
    }
  }, [modes, deleteTargetId]);

  function selectMode(modeId: AgentModeId) {
    vscode.postMessage({ type: 'setAgentMode', modeId });
    setOpen(false);
    setDeleteTargetId(undefined);
  }

  function deleteMode(modeId: AgentModeId) {
    vscode.postMessage({ type: 'deleteAgentMode', modeId });
    setDeleteTargetId(undefined);
  }

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className ?? ''}`}>
      <button
        type="button"
        className="flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded border border-[var(--agent-input-border)] bg-[var(--vscode-dropdown-background)] px-2 text-left text-xs text-[var(--vscode-dropdown-foreground)] outline-none focus:border-[var(--vscode-focusBorder)]"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="min-w-0 flex-1 truncate">{activeMode?.label ?? activeId}</span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div
          className="absolute left-0 top-full z-30 mt-2 grid max-h-72 w-[min(22rem,calc(100vw-1.5rem))] gap-1 overflow-y-auto rounded-md border border-[var(--agent-border)] bg-[var(--vscode-dropdown-background)] p-1 shadow-lg"
          role="listbox"
          aria-label="Agent modes"
        >
          {modes.map((mode) => {
            const active = mode.id === activeId;
            const deletable = !DEFAULT_MODE_IDS.has(mode.id);
            const confirmingDelete = deleteTargetId === mode.id;

            return (
              <div
                key={mode.id}
                className={`flex min-h-9 min-w-0 items-stretch gap-1 rounded ${
                  active
                    ? 'bg-[var(--vscode-list-activeSelectionBackground)] text-[var(--vscode-list-activeSelectionForeground)]'
                    : ''
                }`}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1.5 text-left text-xs outline-none hover:bg-[var(--vscode-list-hoverBackground)] focus:bg-[var(--vscode-list-focusBackground)]"
                  role="option"
                  aria-selected={active}
                  onClick={() => selectMode(mode.id)}
                >
                  <Check size={14} className={`shrink-0 ${active ? 'opacity-100' : 'opacity-0'}`} />
                  <span className="min-w-0 flex-1 truncate font-medium">{mode.label}</span>
                </button>

                {deletable ? (
                  confirmingDelete ? (
                    <>
                      <button
                        type="button"
                        className="flex w-7 shrink-0 items-center justify-center rounded text-[var(--vscode-errorForeground)] outline-none hover:bg-[var(--vscode-list-hoverBackground)] focus:bg-[var(--vscode-list-focusBackground)]"
                        title="Confirm delete"
                        aria-label="Confirm delete"
                        onClick={() => deleteMode(mode.id)}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        className="flex w-7 shrink-0 items-center justify-center rounded outline-none hover:bg-[var(--vscode-list-hoverBackground)] focus:bg-[var(--vscode-list-focusBackground)]"
                        title="Cancel delete"
                        aria-label="Cancel delete"
                        onClick={() => setDeleteTargetId(undefined)}
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="flex w-7 shrink-0 items-center justify-center rounded text-[var(--vscode-errorForeground)] outline-none hover:bg-[var(--vscode-list-hoverBackground)] focus:bg-[var(--vscode-list-focusBackground)]"
                      title="Delete mode"
                      aria-label="Delete mode"
                      onClick={() => setDeleteTargetId(mode.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
