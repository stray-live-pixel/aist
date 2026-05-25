/**
 * Что это: широкая кнопка активных системных инструкций в начале чата.
 * Зачем нужно: пользователь видит примененные инструкции и может быстро поменять активный набор.
 * Пример использования: <SystemInstructionLabel mode={activeMode} sources={instructionSources} promptConfig={promptConfig} />.
 */
import { FileText, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { ModesSettingsPage } from '../../pages/permissions/PermissionsPage';
import { useI18n } from '../../shared/i18n';
import type { AgentInstructionSource, AgentItemRef, AgentMode, AgentPromptConfig } from '../../shared/types';

const CHIP_MAX_LENGTH = 16;

type SystemInstructionLabelProps = {
  mode: AgentMode | undefined;
  sources: AgentInstructionSource[];
  promptConfig: AgentPromptConfig;
  busy?: boolean;
};

export function SystemInstructionLabel({ mode, sources, promptConfig, busy: _busy }: SystemInstructionLabelProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const visibleSources = sources.length ? sources : getFallbackSources(mode, t);
  const title = t('systemInstructions.title', { count: visibleSources.length });
  const chips = getInstructionChips(promptConfig, visibleSources);

  useEffect(() => {
    if (!isOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  return (
    <div className="w-full min-w-0">
      <button
        type="button"
        className="flex min-h-9 w-full min-w-0 items-center gap-2 rounded-[18px] [corner-shape:squircle] border border-[var(--agent-border)] bg-[var(--vscode-input-background)] px-3 py-1.5 text-left text-[10px] text-[var(--vscode-descriptionForeground)] opacity-95 shadow-sm outline-none hover:bg-[var(--vscode-list-hoverBackground)] hover:opacity-100 focus:border-[var(--vscode-focusBorder)]"
        title={t('systemInstructions.show')}
        onClick={() => setIsOpen(true)}
      >
        <FileText size={13} className="shrink-0" />
        <span className="shrink-0 font-semibold uppercase tracking-wide">{t('systemInstructions.shortTitle')}</span>
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1 overflow-hidden">
          {chips.length ? (
            chips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex max-w-[9rem] shrink-0 items-center rounded-full border border-[var(--agent-border)] bg-[var(--vscode-editor-background)] px-2 py-0.5 font-medium text-[var(--vscode-foreground)]"
                title={chip.label}
              >
                {truncateChip(chip.label)}
              </span>
            ))
          ) : (
            <span className="truncate">{title}</span>
          )}
        </span>
      </button>

      {isOpen
        ? createPortal(
            <SystemInstructionDialog title={title} promptConfig={promptConfig} onClose={() => setIsOpen(false)} />,
            document.body
          )
        : null}
    </div>
  );
}

function SystemInstructionDialog({ title, promptConfig, onClose }: SystemInstructionDialogProps) {
  const { t } = useI18n();

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-instruction-title"
      onClick={onClose}
    >
      <section
        className="my-auto flex max-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col rounded-[24px] [corner-shape:squircle] border border-[var(--agent-border)] bg-[var(--vscode-editor-background)] shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--agent-border)] px-4 py-3">
          <div className="min-w-0">
            <h2 id="system-instruction-title" className="truncate text-sm font-semibold">
              {title}
            </h2>
            <p className="m-0 mt-1 text-xs text-[var(--vscode-descriptionForeground)]">
              {t('systemInstructions.manageDescription')}
            </p>
          </div>
          <button type="button" className="icon-button h-7 w-7 shrink-0" title={t('common.close')} onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ModesSettingsPage promptConfig={promptConfig} />
        </div>
      </section>
    </div>
  );
}

function getInstructionChips(promptConfig: AgentPromptConfig, sources: AgentInstructionSource[]) {
  const activeItems = promptConfig.activeInstructionRefs
    .map((ref) => findInstruction(promptConfig, ref))
    .filter((item): item is NonNullable<ReturnType<typeof findInstruction>> => Boolean(item))
    .map((item) => ({ key: refKey(item), label: item.label }));
  const mode = promptConfig.activeModeRef ? findMode(promptConfig, promptConfig.activeModeRef) : undefined;

  return [...activeItems, ...(mode ? [{ key: `mode:${refKey(mode)}`, label: mode.label }] : [])].length
    ? [...activeItems, ...(mode ? [{ key: `mode:${refKey(mode)}`, label: mode.label }] : [])]
    : sources.map((source) => ({ key: source.id, label: source.title }));
}

function findInstruction(promptConfig: AgentPromptConfig, ref: AgentItemRef) {
  return [...promptConfig.globalInstructions, ...promptConfig.localInstructions].find(
    (item) => refKey(item) === refKey(ref)
  );
}

function findMode(promptConfig: AgentPromptConfig, ref: AgentItemRef) {
  return [...promptConfig.globalModes, ...promptConfig.localModes].find((item) => refKey(item) === refKey(ref));
}

function truncateChip(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > CHIP_MAX_LENGTH ? `${normalized.slice(0, CHIP_MAX_LENGTH - 3).trimEnd()}...` : normalized;
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

function refKey(ref: AgentItemRef): string {
  return `${ref.scope}:${ref.id}`;
}

type SystemInstructionDialogProps = {
  title: string;
  promptConfig: AgentPromptConfig;
  onClose(): void;
};
