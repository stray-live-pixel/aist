/**
 * Что это: широкая кнопка активных системных инструкций в начале чата.
 * Зачем нужно: пользователь видит примененные инструкции и может быстро поменять активный набор.
 * Пример использования: <SystemInstructionLabel mode={activeMode} sources={instructionSources} promptConfig={promptConfig} />.
 */
import { FileText, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useI18n } from '../../shared/i18n';
import { vscode } from '../../shared/lib/vscode';
import type {
  AgentInstructionSource,
  AgentItemRef,
  AgentItemScope,
  AgentMode,
  AgentPromptConfig
} from '../../shared/types';
import { Badge, Button, Checkbox, Select } from '../../shared/ui';

const CHIP_MAX_LENGTH = 16;

type SystemInstructionLabelProps = {
  mode: AgentMode | undefined;
  sources: AgentInstructionSource[];
  promptConfig: AgentPromptConfig;
  busy?: boolean;
};

export function SystemInstructionLabel({ mode, sources, promptConfig, busy }: SystemInstructionLabelProps) {
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
        className="flex min-h-9 w-full min-w-0 items-center gap-2 rounded-[18px] [corner-shape:squircle] border border-[var(--agent-border)] bg-[color-mix(in_srgb,var(--vscode-input-background)_88%,transparent)] px-3 py-1.5 text-left text-[10px] text-[var(--vscode-descriptionForeground)] opacity-95 shadow-sm outline-none hover:bg-[var(--vscode-list-hoverBackground)] hover:opacity-100 focus:border-[var(--vscode-focusBorder)]"
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
                className="inline-flex max-w-[9rem] shrink-0 items-center rounded-full border border-[var(--agent-border)] bg-[color-mix(in_srgb,var(--vscode-editor-background)_72%,transparent)] px-2 py-0.5 font-medium text-[var(--vscode-foreground)]"
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

      {isOpen ? (
        <SystemInstructionDialog
          title={title}
          sources={visibleSources}
          promptConfig={promptConfig}
          busy={busy}
          onClose={() => setIsOpen(false)}
        />
      ) : null}
    </div>
  );
}

function SystemInstructionDialog({ title, sources, promptConfig, busy, onClose }: SystemInstructionDialogProps) {
  const { t } = useI18n();
  const instructions = [...promptConfig.globalInstructions, ...promptConfig.localInstructions];
  const modes = [...promptConfig.globalModes, ...promptConfig.localModes];
  const activeInstructionKeys = new Set(promptConfig.activeInstructionRefs.map(refKey));
  const selectedModeKey = promptConfig.activeModeRef ? refKey(promptConfig.activeModeRef) : '';

  function toggleInstruction(ref: AgentItemRef, checked: boolean) {
    const next = checked
      ? [...promptConfig.activeInstructionRefs, ref]
      : promptConfig.activeInstructionRefs.filter((item) => refKey(item) !== refKey(ref));
    vscode.postMessage({ type: 'setActivePromptConfig', instructionRefs: next, modeRef: promptConfig.activeModeRef });
  }

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
        <div className="grid min-h-0 gap-4 overflow-y-auto px-4 py-4">
          <section className="grid gap-3 rounded-lg border border-[var(--agent-border)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="m-0 text-xs font-semibold uppercase tracking-wide">
                  {t('systemInstructions.activeSet')}
                </h3>
                <p className="m-0 mt-1 text-xs text-[var(--vscode-descriptionForeground)]">
                  {t('systemInstructions.activeSetDescription')}
                </p>
              </div>
              {promptConfig.activePresetId ? <Badge tone="accent">{promptConfig.activePresetId}</Badge> : null}
            </div>
            <Select
              label={t('systemInstructions.modeSelect')}
              value={selectedModeKey}
              disabled={busy}
              placeholder={t('systemInstructions.noMode')}
              options={[
                { value: '', label: t('systemInstructions.noMode') },
                ...modes.map((item) => ({ value: refKey(item), label: formatModeLabel(item.scope, item.label) }))
              ]}
              onChange={(event) => {
                const modeRef = parseRefKey(event.target.value);
                vscode.postMessage({
                  type: 'setActivePromptConfig',
                  instructionRefs: promptConfig.activeInstructionRefs,
                  modeRef
                });
              }}
            />
            <div className="grid gap-2">
              {instructions.map((instruction) => {
                const ref = { scope: instruction.scope, id: instruction.id };
                return (
                  <Checkbox
                    key={refKey(ref)}
                    label={formatInstructionLabel(instruction.scope, instruction.label)}
                    description={instruction.content.slice(0, 140)}
                    disabled={busy}
                    checked={activeInstructionKeys.has(refKey(ref))}
                    onChange={(event) => toggleInstruction(ref, event.target.checked)}
                  />
                );
              })}
              {!instructions.length ? (
                <p className="m-0 text-xs text-[var(--vscode-descriptionForeground)]">
                  {t('systemInstructions.noAdditional')}
                </p>
              ) : null}
            </div>
          </section>

          <section className="grid gap-2">
            <h3 className="m-0 text-xs font-semibold uppercase tracking-wide">
              {t('systemInstructions.effectiveSources')}
            </h3>
            {sources.map((source) => (
              <article key={source.id} className="rounded border border-[var(--agent-border)] p-3">
                <div className="mb-1 flex items-center justify-between gap-2 text-xs font-semibold">
                  <span className="min-w-0 truncate">{source.title}</span>
                  <span className="shrink-0 text-[var(--vscode-descriptionForeground)]">#{source.priority}</span>
                </div>
                <p className="m-0 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-[var(--vscode-descriptionForeground)]">
                  {source.content}
                </p>
              </article>
            ))}
          </section>
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

function formatInstructionLabel(scope: AgentItemScope, label: string): string {
  return `${scope === 'local' ? 'Project' : 'Global'} · ${label}`;
}

function formatModeLabel(scope: AgentItemScope, label: string): string {
  return `${label} (${scope === 'local' ? 'Project' : 'Global'})`;
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

function refKey(ref: AgentItemRef | { scope: AgentItemScope; id: string }): string {
  return `${ref.scope}:${ref.id}`;
}

function parseRefKey(value: string): AgentItemRef | undefined {
  const [scope, ...rest] = value.split(':');
  const id = rest.join(':');
  return (scope === 'global' || scope === 'local') && id ? { scope, id } : undefined;
}

type SystemInstructionDialogProps = {
  title: string;
  sources: AgentInstructionSource[];
  promptConfig: AgentPromptConfig;
  busy?: boolean;
  onClose(): void;
};
