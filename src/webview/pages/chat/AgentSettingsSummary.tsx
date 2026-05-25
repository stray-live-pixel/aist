import { Archive, Brain, Coins, Settings2, ShieldCheck, SlidersHorizontal, Wrench } from 'lucide-react';
import { memo, useMemo } from 'react';

import { useI18n } from '../../shared/i18n';
import { vscode } from '../../shared/lib/vscode';
import type { AgentState, ChatContextEstimate, ModelOption, ReasoningEffort } from '../../shared/types';
import { Button, Select, type SelectCategory, type SelectOption } from '../../shared/ui';
import styles from './ChatPage.module.scss';

type AgentSettingsSummaryProps = {
  state: AgentState;
  onOpen(): void;
};

/**
 * Что это: компактная панель быстрых настроек над composer.
 * Зачем нужно: позволяет менять режим, preset доступа и reasoning без открытия полной модалки settings.
 */
export const AgentSettingsSummary = memo(function AgentSettingsSummary({ state, onOpen }: AgentSettingsSummaryProps) {
  const { t } = useI18n();
  const agentModeOptions = useMemo(() => getAgentModeOptions(state), [state.agentModes]);
  const agentModeDisplayLabels = useMemo(() => getAgentModeDisplayLabels(state), [state.agentModes]);
  const permissionOptions = useMemo(
    () => [
      ...(state.activeToolPermissionPresetId === 'custom' ? [{ value: 'custom', label: t('common.custom') }] : []),
      ...state.toolPermissionPresets.map((preset) => ({
        value: preset.id,
        label: t(`settings.preset.${preset.id}.label` as never)
      }))
    ],
    [state.activeToolPermissionPresetId, state.toolPermissionPresets, t]
  );
  const reasoningOptions = useMemo(
    () => [
      { value: 'auto', label: t('reasoning.autoDetailed') },
      { value: 'low', label: t('reasoning.lowDetailed') },
      { value: 'medium', label: t('reasoning.mediumDetailed') },
      { value: 'high', label: t('reasoning.highDetailed') }
    ],
    [t]
  );

  return (
    <div className={styles.summaryRoot}>
      <CompactSelect
        icon={<SlidersHorizontal size={12} />}
        title={t('summary.agentMode')}
        value={state.agentMode}
        disabled={state.activeChat.busy}
        onChange={(modeId) => vscode.postMessage({ type: 'setAgentMode', modeId })}
        options={agentModeOptions}
        displayLabels={agentModeDisplayLabels}
      />
      <CompactSelect
        icon={<ShieldCheck size={12} />}
        title={t('summary.toolPermissionPreset')}
        value={state.activeToolPermissionPresetId}
        disabled={state.activeChat.busy || state.activeToolPermissionPresetId === 'custom'}
        onChange={(presetId) => vscode.postMessage({ type: 'setToolPermissionPreset', presetId })}
        options={permissionOptions}
      />
      <CompactSelect
        icon={<Brain size={12} />}
        title={t('summary.reasoningEffort')}
        value={state.reasoningEffort}
        disabled={state.activeChat.busy}
        onChange={(reasoningEffort) =>
          vscode.postMessage({ type: 'setReasoningEffort', reasoningEffort: reasoningEffort as ReasoningEffort })
        }
        options={reasoningOptions}
      />
      <Button type="button" variant="secondary" size="sm" leadingIcon={<Wrench size={12} />} onClick={onOpen}>
        {t('summary.toolsCount', { count: state.tools.length })}
      </Button>
    </div>
  );
});

/**
 * Что это: нижняя строка контекста composer.
 * Зачем нужно: показывает модель, заполнение контекста, стоимость и ручную команду compaction без расширения основного composer.
 */
export const ComposerContextSummary = memo(function ComposerContextSummary({ state }: { state: AgentState }) {
  const { t } = useI18n();
  const modelOptions = useMemo(() => getModelOptions(state), [state.activeChat.model, state.models]);
  const modelCategories = useMemo(
    () => (state.models.length ? getModelCategories(state.models) : undefined),
    [state.models]
  );

  return (
    <div className={styles.contextSummaryRoot}>
      <CompactSelect
        icon={<Settings2 size={12} />}
        title={t('summary.model')}
        value={state.activeChat.model}
        disabled={state.activeChat.busy}
        className={`${styles.compactSelect} ${styles.modelSelect}`}
        onChange={(model) => vscode.postMessage({ type: 'setModel', model })}
        options={modelOptions}
        categories={modelCategories}
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
});

function getModelOptions(state: AgentState): SelectOption[] {
  return state.models.length
    ? state.models.map((model) => ({
        value: model.id,
        label: model.name,
        category: model.provider || 'openrouter'
      }))
    : [{ value: state.activeChat.model, label: state.activeChat.model }];
}

function getModelCategories(models: ModelOption[]): SelectCategory[] {
  const providers = new Set(models.map((model) => model.provider || 'openrouter'));
  const categories: SelectCategory[] = [
    { id: 'openrouter', label: 'OpenRouter' },
    { id: 'codex', label: 'ChatGPT Codex' }
  ];
  return categories.filter((category) => providers.has(category.id as NonNullable<ModelOption['provider']>));
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

const CompactSelect = memo(function CompactSelect({
  icon,
  title,
  value,
  options,
  categories,
  disabled,
  displayLabels,
  className = styles.compactSelect,
  onChange
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  options: SelectOption[];
  categories?: SelectCategory[];
  disabled?: boolean;
  displayLabels?: Record<string, string>;
  className?: string;
  onChange(value: string): void;
}) {
  return (
    <Select
      className={className}
      size="sm"
      leadingIcon={icon}
      aria-label={title}
      title={title}
      value={value}
      disabled={disabled}
      displayLabels={displayLabels}
      options={options}
      categories={categories}
      onChange={(event) => onChange(event.target.value)}
    />
  );
});

const ContextUsagePie = memo(function ContextUsagePie({ context }: { context: ChatContextEstimate | undefined }) {
  const { t } = useI18n();
  const percent = clampPercent(context?.percent ?? 0);
  const title = formatContextFill(context, t('common.notAvailable'));

  return (
    <span className={styles.contextUsage} title={title}>
      <span className={styles.contextPie} aria-hidden="true">
        <span
          className={styles.contextPieFill}
          style={{
            background: `conic-gradient(color-mix(in srgb, var(--vscode-textLink-foreground) 72%, var(--vscode-foreground)) ${percent * 3.6}deg, transparent 0deg)`
          }}
        />
        <span className={styles.contextPieHole} />
      </span>
      <span className={styles.truncate}>{formatContextFill(context, t('common.notAvailable'))}</span>
    </span>
  );
});

const SummaryItem = memo(function SummaryItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className={styles.summaryItem}>
      <span className={styles.summaryIcon}>{icon}</span>
      <span className={styles.truncate}>{text}</span>
    </span>
  );
});

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

function formatContextFill(context: ChatContextEstimate | undefined, fallback: string): string {
  if (!context?.tokens) {
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
