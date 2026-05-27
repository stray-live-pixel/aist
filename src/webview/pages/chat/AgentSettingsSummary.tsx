import { Archive, Brain, Coins, FileText, Settings2, ShieldCheck, UserRound } from 'lucide-react';
import { memo, useMemo } from 'react';

import { useI18n } from '../../shared/i18n';
import { agentActions } from '../../shared/lib/agentActions';
import type {
  AgentState,
  ChatContextEstimate,
  CodexServiceTier,
  ModelOption,
  ReasoningEffort
} from '../../shared/types';
import {
  CompactControlGroup,
  CompactControlItem,
  CompactNavigationButton,
  ContextUsageIndicator,
  Select,
  type SelectCategory,
  type SelectOption
} from '../../shared/ui';
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
    <CompactControlGroup className={styles.summaryRoot}>
      <ComposerContextControls state={state} />
      <CompactNavigationButton
        icon={<UserRound size={12} />}
        title={t('summary.agentMode')}
        label={activeRoleLabel}
        onClick={() => onOpen('presets')}
      />
      <CompactNavigationButton
        icon={<FileText size={12} />}
        title={t('settings.promptManager.activePresetTitle')}
        label={activePresetLabel}
        onClick={() => onOpen('presets')}
      />
      {actions ? <div className={styles.summaryActions}>{actions}</div> : null}
    </CompactControlGroup>
  );
});

/**
 * Что это: нижняя строка быстрых controls composer.
 * Зачем нужно: показывает модель, reasoning, preset доступов и стоимость без расширения основного composer.
 */
export const ComposerContextSummary = memo(function ComposerContextSummary({ state }: { state: AgentState }) {
  const { t } = useI18n();
  const modelOptions = useMemo(() => getModelOptions(state), [state.activeChat.model, state.models]);
  const modelCategories = useMemo(
    () => (state.models.length ? getModelCategories(state.models) : undefined),
    [state.models]
  );
  const activeModel = state.models.find((model) => model.id === state.activeChat.model);
  const codexServiceTierOptions = getCodexServiceTierOptions(activeModel);
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
    <CompactControlGroup className={styles.contextSummaryRoot}>
      <Select
        className={`${styles.compactSelect} ${styles.modelSelect}`}
        size="sm"
        leadingIcon={<Settings2 size={12} />}
        aria-label={t('summary.model')}
        title={t('summary.model')}
        value={state.activeChat.model}
        disabled={state.activeChat.busy}
        onChange={(event) => agentActions.setModel(event.target.value)}
        options={modelOptions}
        categories={modelCategories}
      />
      <Select
        className={`${styles.compactSelect} ${styles.reasoningCompactSelect}`}
        size="sm"
        leadingIcon={<Brain size={12} />}
        aria-label={t('summary.reasoningEffort')}
        title={t('summary.reasoningEffort')}
        value={state.reasoningEffort}
        disabled={state.activeChat.busy}
        onChange={(event) => agentActions.setReasoningEffort(event.target.value as ReasoningEffort)}
        options={getReasoningOptions()}
      />
      {codexServiceTierOptions ? (
        <Select
          className={`${styles.compactSelect} ${styles.reasoningCompactSelect}`}
          size="sm"
          leadingIcon={<Settings2 size={12} />}
          aria-label="Codex speed"
          title="Codex speed"
          value={state.codexServiceTier}
          disabled={state.activeChat.busy}
          onChange={(event) => agentActions.setCodexServiceTier(event.target.value as CodexServiceTier)}
          options={codexServiceTierOptions}
        />
      ) : null}
      <Select
        className={`${styles.compactSelect} ${styles.permissionsCompactSelect}`}
        size="sm"
        leadingIcon={<ShieldCheck size={12} />}
        aria-label={t('summary.toolPermissionPreset')}
        title={t('summary.toolPermissionPreset')}
        value={state.activeToolPermissionPresetId}
        disabled={state.activeChat.busy}
        onChange={(event) => agentActions.setToolPermissionPreset(event.target.value)}
        options={permissionOptions}
      />
      {state.activeChat.usage.costUsd !== undefined ? (
        <CompactControlItem
          icon={<Coins size={12} />}
          text={t('summary.cost', { cost: formatCost(state.activeChat.usage.costUsd) })}
        />
      ) : null}
    </CompactControlGroup>
  );
});

const ComposerContextControls = memo(function ComposerContextControls({ state }: { state: AgentState }) {
  const { t } = useI18n();

  return (
    <CompactControlGroup inline>
      <ContextUsage context={state.activeChat.context} />
      <CompactNavigationButton
        icon={<Archive size={12} />}
        label={t('summary.compact')}
        title={t('summary.compactTitle')}
        disabled={state.activeChat.busy}
        onClick={() => agentActions.compactChat(state.activeChat.id)}
      />
    </CompactControlGroup>
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

/**
 * Возвращает варианты ускорения только для Codex-моделей с объявленной поддержкой.
 * Так UI не предлагает priority для OpenRouter и для будущих Codex-моделей, если API
 * перестанет принимать service_tier или потребует отдельного entitlement.
 */
function getCodexServiceTierOptions(model: ModelOption | undefined): SelectOption[] | undefined {
  if (model?.provider !== 'codex' || !model.codexServiceTiers?.includes('priority')) {
    return undefined;
  }

  return [
    { value: 'auto', label: 'auto' },
    { value: 'priority', label: 'priority' }
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

const ContextUsage = memo(function ContextUsage({ context }: { context: ChatContextEstimate | undefined }) {
  const { t } = useI18n();
  const text = formatContextFill(context, t('common.notAvailable'));

  return <ContextUsageIndicator title={text} text={text} percent={clampPercent(context?.percent ?? 0)} />;
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
