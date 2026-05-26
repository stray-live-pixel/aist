import { Archive, Brain, Coins, FileText, Settings2, ShieldCheck, UserRound } from 'lucide-react';
import { memo, useMemo } from 'react';

import { useI18n } from '../../shared/i18n';
import { agentActions } from '../../shared/lib/agentActions';
import type { AgentState, ChatContextEstimate, ModelOption, ReasoningEffort } from '../../shared/types';
import { Button, Select, type SelectCategory, type SelectOption } from '../../shared/ui';
import type { SettingsPageId } from '../permissions/permissions-page/types';
import styles from './ChatPage.module.scss';

type AgentSettingsSummaryProps = {
  state: AgentState;
  actions?: React.ReactNode;
  onOpen(page?: SettingsPageId): void;
};

/**
 * Что это: компактная панель быстрых настроек над composer.
 * Зачем нужно: позволяет менять режим, preset доступа и reasoning без открытия полной модалки settings.
 */
export const AgentSettingsSummary = memo(function AgentSettingsSummary({
  state,
  actions,
  onOpen
}: AgentSettingsSummaryProps) {
  const { t } = useI18n();
  const activeRoleLabel = getActiveRoleLabel(state, t('systemInstructions.noRole'));
  const activePresetLabel = getActivePresetLabel(state, t('settings.promptManager.noActivePreset'));
  return (
    <div className={styles.summaryRoot}>
      <SummaryNavigationButton
        icon={<UserRound size={12} />}
        title={t('summary.agentMode')}
        label={activeRoleLabel}
        onClick={() => onOpen('presets')}
      />
      <SummaryNavigationButton
        icon={<FileText size={12} />}
        title={t('settings.promptManager.activePresetTitle')}
        label={activePresetLabel}
        onClick={() => onOpen('presets')}
      />
      <ComposerContextControls state={state} />
      {actions ? <div className={styles.summaryActions}>{actions}</div> : null}
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

  return (
    <div className={styles.contextSummaryRoot}>
      <CompactSelect
        icon={<Settings2 size={12} />}
        title={t('summary.model')}
        value={state.activeChat.model}
        disabled={state.activeChat.busy}
        className={`${styles.compactSelect} ${styles.modelSelect}`}
        onChange={agentActions.setModel}
        options={modelOptions}
        categories={modelCategories}
      />
      <CompactSelect
        icon={<Brain size={12} />}
        title={t('summary.reasoningEffort')}
        value={state.reasoningEffort}
        disabled={state.activeChat.busy}
        className={`${styles.compactSelect} ${styles.reasoningCompactSelect}`}
        onChange={(reasoningEffort) => agentActions.setReasoningEffort(reasoningEffort as ReasoningEffort)}
        options={getReasoningOptions()}
      />
      <CompactSelect
        icon={<ShieldCheck size={12} />}
        title={t('summary.toolPermissionPreset')}
        value={state.activeToolPermissionPresetId}
        disabled={state.activeChat.busy || state.activeToolPermissionPresetId === 'custom'}
        className={`${styles.compactSelect} ${styles.permissionsCompactSelect}`}
        onChange={agentActions.setToolPermissionPreset}
        options={permissionOptions}
      />
      {state.activeChat.usage.costUsd !== undefined ? (
        <SummaryItem
          icon={<Coins size={12} />}
          text={t('summary.cost', { cost: formatCost(state.activeChat.usage.costUsd) })}
        />
      ) : null}
    </div>
  );
});

const ComposerContextControls = memo(function ComposerContextControls({ state }: { state: AgentState }) {
  const { t } = useI18n();

  return (
    <div className={styles.contextControls}>
      <ContextUsagePie context={state.activeChat.context} />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        leadingIcon={<Archive size={12} />}
        disabled={state.activeChat.busy}
        title={t('summary.compactTitle')}
        onClick={() => agentActions.compactChat(state.activeChat.id)}
      >
        {t('summary.compact')}
      </Button>
    </div>
  );
});

const SummaryNavigationButton = memo(function SummaryNavigationButton({
  icon,
  title,
  label,
  onClick
}: {
  icon: React.ReactNode;
  title: string;
  label: string;
  onClick(): void;
}) {
  return (
    <button type="button" className={styles.summaryNavButton} title={title} onClick={onClick}>
      <span className={styles.summaryIcon}>{icon}</span>
      <span className={styles.truncate}>{label}</span>
    </button>
  );
});

function getReasoningOptions(): SelectOption[] {
  return [
    { value: 'auto', label: 'auto' },
    { value: 'low', label: 'slow' },
    { value: 'medium', label: 'medium' },
    { value: 'high', label: 'high' }
  ];
}

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

function getActiveRoleLabel(state: AgentState, fallback: string): string {
  const roleRef = state.promptConfig.activeModeRef;
  if (!roleRef) return fallback;
  const role = [...state.promptConfig.globalModes, ...state.promptConfig.localModes].find(
    (mode) => mode.scope === roleRef.scope && mode.id === roleRef.id
  );
  return role?.label || fallback;
}

function getActivePresetLabel(state: AgentState, fallback: string): string {
  if (!state.promptConfig.activePresetId) return fallback;
  return (
    state.promptConfig.presets.find((preset) => preset.id === state.promptConfig.activePresetId)?.label || fallback
  );
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
