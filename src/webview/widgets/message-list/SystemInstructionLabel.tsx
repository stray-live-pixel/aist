/**
 * Что это: компактный label активной системной инструкции в начале чата.
 * Зачем нужно: длинная инструкция не занимает заголовок, но остается доступной по клику.
 * Пример использования: <SystemInstructionLabel mode={activeMode} />.
 */
import { FileText, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type { AgentMode } from '../../shared/types';

type SystemInstructionLabelProps = {
  mode: AgentMode | undefined;
};

export function SystemInstructionLabel({ mode }: SystemInstructionLabelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const instruction = mode?.instructions.trim() || 'No additional instructions.';
  const title = mode?.label ? `System instruction: ${mode.label}` : 'System instruction';

  useEffect(() => {
    if (!isOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  return (
    <div className="flex justify-start">
      <button
        type="button"
        className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--agent-border)] bg-[var(--vscode-input-background)] px-3 py-1.5 text-xs text-[var(--vscode-descriptionForeground)] outline-none hover:bg-[var(--vscode-list-hoverBackground)] focus:border-[var(--vscode-focusBorder)]"
        title="Open full system instruction"
        onClick={() => setIsOpen(true)}
      >
        <FileText size={14} className="shrink-0" />
        <span className="truncate">{title}</span>
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="system-instruction-title"
          onClick={() => setIsOpen(false)}
        >
          <section
            className="flex max-h-full w-full max-w-3xl flex-col rounded-[24px] [corner-shape:squircle] border border-[var(--agent-border)] bg-[var(--vscode-editor-background)] shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--agent-border)] px-4 py-3">
              <h2 id="system-instruction-title" className="min-w-0 truncate text-sm font-semibold">
                {title}
              </h2>
              <button
                type="button"
                className="icon-button h-7 w-7 shrink-0"
                title="Close"
                aria-label="Close system instruction"
                onClick={() => setIsOpen(false)}
              >
                <X size={14} />
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto px-4 py-4">
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{instruction}</ReactMarkdown>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
