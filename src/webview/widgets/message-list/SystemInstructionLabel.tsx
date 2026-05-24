/**
 * Что это: компактный label активных системных инструкций в начале чата.
 * Зачем нужно: пользователь видит все правила и skills в том же порядке, в котором они передаются агенту.
 * Пример использования: <SystemInstructionLabel mode={activeMode} sources={instructionSources} />.
 */
import { FileText, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useI18n } from '../../shared/i18n';
import type { AgentInstructionSource, AgentMode } from '../../shared/types';

type SystemInstructionLabelProps = {
  mode: AgentMode | undefined;
  sources: AgentInstructionSource[];
};

export function SystemInstructionLabel({ mode, sources }: SystemInstructionLabelProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const visibleSources = sources.length ? sources : getFallbackSources(mode, t);
  const title = t('systemInstructions.title', { count: visibleSources.length });

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
        title={t('systemInstructions.show')}
        onClick={() => setIsOpen(true)}
      >
        <FileText size={14} className="shrink-0" />
        <span className="truncate">{title}</span>
      </button>

      {isOpen ? (
        <SystemInstructionDialog title={title} sources={visibleSources} onClose={() => setIsOpen(false)} />
      ) : null}
    </div>
  );
}

function SystemInstructionDialog({ title, sources, onClose }: SystemInstructionDialogProps) {
  const { t } = useI18n();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-instruction-title"
      onClick={onClose}
    >
      <section
        className="flex max-h-full w-full max-w-3xl flex-col rounded-[24px] [corner-shape:squircle] border border-[var(--agent-border)] bg-[var(--vscode-editor-background)] shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--agent-border)] px-4 py-3">
          <h2 id="system-instruction-title" className="min-w-0 truncate text-sm font-semibold">
            {title}
          </h2>
          <button type="button" className="icon-button h-7 w-7 shrink-0" title={t('common.close')} onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <div className="grid min-h-0 gap-3 overflow-y-auto px-4 py-4">
          {sources.map((source) => (
            <article key={source.id} className="rounded border border-[var(--agent-border)] p-3">
              <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold">
                <span>{source.title}</span>
                <span className="text-[var(--vscode-descriptionForeground)]">#{source.priority}</span>
              </div>
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{source.content}</ReactMarkdown>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function getFallbackSources(mode: AgentMode | undefined, t: ReturnType<typeof useI18n>['t']): AgentInstructionSource[] {
  return [
    {
      id: 'mode-fallback',
      title: mode?.label ? t('systemInstructions.mode', { mode: mode.label }) : t('systemInstructions.fallbackTitle'),
      content: mode?.instructions.trim() || t('systemInstructions.noAdditional'),
      priority: 50,
      kind: 'mode'
    }
  ];
}

type SystemInstructionDialogProps = {
  title: string;
  sources: AgentInstructionSource[];
  onClose(): void;
};
