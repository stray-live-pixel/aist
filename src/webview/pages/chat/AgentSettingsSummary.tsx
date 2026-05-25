import { Archive, Brain, Coins, Settings2, ShieldCheck, SlidersHorizontal, Wrench } from 'lucide-react';

import { useI18n } from '../../shared/i18n';
import { vscode } from '../../shared/lib/vscode';
import type { AgentState, ChatContextEstimate, ReasoningEffort } from '../../shared/types';
import { Button, Select, type SelectOption } from '../../shared/ui';

type AgentSettingsSummaryProps = {
  state: AgentState;
  onOpen(): void;
};

export function AgentSettingsSummary({ state, onOpen }: AgentSettingsSummaryProps) {
  const { t } = useI18n();

  return (
    <div className="flex min-w-0 items-center gap-1.5 overflow-visible whitespace-nowrap text-[11px] leading-4 text-[var(--vscode-descriptionForeground)]">
      <CompactSelect
        icon={<SlidersHorizontal size={12} />}
        title={t('summary.agentMode')}
        value={state.agentMode}
        disabled={state.activeChat.busy}
        onChange={(modeId) => vscode.postMessage({ type: 'setAgentMode', modeId })}
        options={getAgentModeOptions(state)}
        displayLabels={getAgentModeDisplayLabels(state)}
      />
      <CompactSelect
        icon={<ShieldCheck size={12} />}
        title={t('summary.toolPermissionPreset')}
        value={state.activeToolPermissionPresetId}
        disabled={state.activeChat.busy || state.activeToolPermissionPresetId === 'custom'}
        onChange={(presetId) => vscode.postMessage({ type: 'setToolPermissionPreset', presetId })}
        options={[
          ...(state.activeToolPermissionPresetId === 'custom' ? [{ value: 'custom', label: t('common.custom') }] : []),
          ...state.toolPermissionPresets.map((preset) => ({
            value: preset.id,
            label: t(`settings.preset.${preset.id}.label` as never)
          }))
        ]}
      />
      <CompactSelect
        icon={<Brain size={12} />}
        title={t('summary.reasoningEffort')}
        value={state.reasoningEffort}
        disabled={state.activeChat.busy}
        onChange={(reasoningEffort) =>
          vscode.postMessage({ type: 'setReasoningEffort', reasoningEffort: reasoningEffort as ReasoningEffort })
        }
        options={[
          { value: 'auto', label: t('reasoning.autoDetailed') },
          { value: 'low', label: t('reasoning.lowDetailed') },
          { value: 'medium', label: t('reasoning.mediumDetailed') },
          { value: 'high', label: t('reasoning.highDetailed') }
        ]}
      />
      <Button type="button" variant="secondary" size="sm" leadingIcon={<Wrench size={12} />} onClick={onOpen}>
        {t('summary.toolsCount', { count: state.tools.length })}
      </Button>
    </div>
  );
}

export function ComposerContextSummary({ state }: { state: AgentState }) {
  const { t } = useI18n();

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[10px] leading-4 text-[var(--vscode-descriptionForeground)]">
      <CompactSelect
        icon={<Settings2 size={12} />}
        title={t('summary.model')}
        value={state.activeChat.model}
        disabled={state.activeChat.busy}
        className="w-[clamp(8.5rem,24vw,13rem)]"
        onChange={(model) => vscode.postMessage({ type: 'setModel', model })}
        options={
          state.models.length
            ? state.models.map((model) => ({ value: model.id, label: model.name }))
            : [{ value: state.activeChat.model, label: state.activeChat.model }]
        }
      />
      <ContextUsagePie context={state.activeChat.context} />
      {state.activeChat.usage.costUsd !== undefined ? (
        <SummaryItem
          icon={<Coins size={12} />}
          text={t('summary.cost', { cost: formatCost(state.activeChat.usage.costUsd) })}
        />
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        leadingIcon={<Archive size={12} />}
        disabled={state.activeChat.busy}
        title={t('summary.compactTitle')}
        onClick={() => vscode.postMessage({ type: 'compactChat', chatId: state.activeChat.id })}
      >
        {t('summary.compact')}
      </Button>
    </div>
  );
}

function getAgentModeOptions(state: AgentState): SelectOption[] {
  const modes = state.agentModes.filter((mode) => !mode.id.startsWith('preset:'));
  const presets = state.agentModes.filter((mode) => mode.id.startsWith('preset:'));
  return [
    ...modes.map((mode) => ({ value: mode.id, label: mode.label })),
    ...presets.map((mode) => ({ value: mode.id, label: mode.label }))
  ];
}

function getAgentModeDisplayLabels(state: AgentState): Record<string, string> {
  return Object.fromEntries(state.agentModes.map((mode) => [mode.id, compactModeLabel(mode.id, mode.label)]));
}

function compactModeLabel(modeId: string, label: string): string {
  const cleaned = label
    .replace(/^Mode\s*·\s*(Global|Project)\s*·\s*/i, '')
    .replace(/^Preset with instructions\s*·\s*/i, '')
    .replace(/\s+preset$/i, '');
  const scope = modeId.startsWith('global:')
    ? 'G'
    : modeId.startsWith('local:')
      ? 'P'
      : modeId.startsWith('preset:')
        ? 'Preset'
        : '';
  return scope ? `${cleaned} · ${scope}` : cleaned;
}

function CompactSelect({
  icon,
  title,
  value,
  options,
  disabled,
  displayLabels,
  className = 'w-[clamp(6.8rem,18vw,10.5rem)]',
  onChange
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  options: SelectOption[];
  disabled?: boolean;
  displayLabels?: Record<string, string>;
  className?: string;
  onChange(value: string): void;
}) {
  return (
    <Select
      className={`${className} shrink min-w-0`}
      size="sm"
      leadingIcon={icon}
      aria-label={title}
      title={title}
      value={value}
      disabled={disabled}
      displayLabels={displayLabels}
      options={options}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function ContextUsagePie({ context }: { context: ChatContextEstimate | undefined }) {
  const { t } = useI18n();
  const percent = clampPercent(
    context?.percent ?? (context?.maxTokens ? (context.tokens / context.maxTokens) * 100 : 0)
  );
  const title = formatContextFill(context, t('common.notAvailable'));

  return (
    <span className="flex min-w-0 items-center gap-1.5" title={title}>
      <span
        className="relative inline-flex h-4 w-4 shrink-0 rounded-full border border-[color-mix(in_srgb,var(--vscode-descriptionForeground)_20%,transparent)] bg-[color-mix(in_srgb,var(--vscode-descriptionForeground)_10%,transparent)]"
        aria-hidden="true"
      >
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(color-mix(in srgb, var(--vscode-textLink-foreground) 72%, var(--vscode-foreground)) ${percent * 3.6}deg, transparent 0deg)`
          }}
        />
        <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--vscode-input-background)]" />
      </span>
      <span className="truncate">{formatContextFill(context, t('common.notAvailable'))}</span>
    </span>
  );
}

function SummaryItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{text}</span>
    </span>
  );
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

function formatContextFill(context: ChatContextEstimate | undefined, fallback: string): string {
  if (!context) {
    return fallback;
  }

  const tokens = formatTokens(context.tokens);
  const percent = context.percent !== undefined ? ` (${Math.round(context.percent)}%)` : '';

  if (!context.maxTokens) {
    return `${tokens}${percent}`;
  }

  return `${tokens}/${formatTokens(context.maxTokens)}${percent}`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }

  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }

  return String(tokens);
}

function formatCost(costUsd: number): string {
  if (costUsd === 0) {
    return '$0.00';
  }

  if (costUsd < 0.0001) {
    return `~$${costUsd.toFixed(6)}`;
  }

  return `~$${costUsd.toFixed(4)}`;
}
