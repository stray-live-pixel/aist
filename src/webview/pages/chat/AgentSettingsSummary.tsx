import { Archive, Brain, Coins, Cpu, FileText, LoaderCircle, RotateCcw, Settings2, ShieldCheck } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';

import {
  getActiveModelProvider,
  getProviderModelOptions,
  getProviderOptions,
  getSelectedProviderProfile
} from '../../features/select-model';
import { useI18n } from '../../shared/i18n';
import { agentActions } from '../../shared/lib/agentActions';
import type {
  AgentState,
  ChatContextEstimate,
  CodexServiceTier,
  ModelOption,
  ReasoningEffort,
  ToolPermissionPresetId
} from '../../shared/types';
import {
  CompactControlGroup,
  CompactControlItem,
  CompactNavigationButton,
  ContextUsageIndicator,
  Select,
  type SelectOption
} from '../../shared/ui';
import type { SettingsPageId } from '../permissions/permissions-page/types';
import styles from './ChatPage.module.scss';

type AgentSettingsSummaryProps = {
  state: AgentState;
  actions?: React.ReactNode;
  onOpen(page?: SettingsPageId): void;
};

const REASONING_DISPLAY_LABELS: Record<ReasoningEffort, string> = {
  auto: 'Auto',
  low: 'Low',
  medium: 'Med',
  high: 'High',
  xhigh: 'XHigh'
};

const CODEX_TIER_DISPLAY_LABELS: Record<CodexServiceTier, string> = {
  auto: '1×',
  priority: '2×'
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
  const instructionCount = state.promptConfig.activeInstructionRefs.length;
  const profileLabel = formatInstructionProfileLabel(activeRoleLabel, activePresetLabel, instructionCount);
  const profileTitle = `${t('summary.agentMode')}: ${activeRoleLabel}\n${t(
    'settings.promptManager.activePresetTitle'
  )}: ${activePresetLabel}\n${t('common.instructions')}: ${instructionCount}`;

  return (
    <CompactControlGroup className={styles.summaryRoot}>
      <ComposerContextControls state={state} />
      <CompactNavigationButton
        className={styles.profileSummaryButton}
        icon={<FileText size={12} />}
        title={profileTitle}
        label={profileLabel}
        onClick={() => onOpen('presets')}
      />
      {actions ? <div className={styles.summaryActions}>{actions}</div> : null}
    </CompactControlGroup>
  );
});

/**
 * Что это: нижняя строка быстрых controls composer.
 * Зачем нужно: оставляет внизу только часто меняемые разрешения и короткие метаданные, чтобы поле ввода не перегружалось модельными настройками.
 */
export const ComposerContextSummary = memo(function ComposerContextSummary({
  state,
  modelControl
}: {
  state: AgentState;
  modelControl?: React.ReactNode;
}) {
  const { t } = useI18n();
  const permissionOptions = usePermissionOptions({ state, t });
  const permissionDisplayLabels = useMemo(
    () => getPermissionDisplayLabels(permissionOptions, state.activeToolPermissionPresetId),
    [permissionOptions, state.activeToolPermissionPresetId]
  );

  return (
    <CompactControlGroup className={styles.contextSummaryRoot}>
      {modelControl ? <div className={styles.modelSummarySlot}>{modelControl}</div> : null}
      <Select
        className={`${styles.compactSelect} ${styles.permissionsCompactSelect}`}
        size="sm"
        leadingIcon={<ShieldCheck size={12} />}
        aria-label={t('summary.toolPermissionPreset')}
        title={t('summary.toolPermissionPreset')}
        value={state.activeToolPermissionPresetId}
        onChange={(event) => agentActions.setToolPermissionPreset(event.target.value)}
        options={permissionOptions}
        displayLabels={permissionDisplayLabels}
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

/**
 * Что это: плавающая панель основных настроек рабочей модели.
 * Зачем нужно: переносит редко меняемые provider/model/reasoning/speed из нижней строки composer в раскрываемое меню.
 */
export const ModelSettingsPanel = memo(function ModelSettingsPanel({
  state,
  minimized
}: {
  state: AgentState;
  minimized: boolean;
}) {
  const { t } = useI18n();
  const modelControls = useModelControls({ state });
  const className = [styles.modelControlsFloat, minimized ? styles.modelControlsFloatCollapsed : undefined]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} aria-label={t('summary.model')} aria-hidden={minimized}>
      <Select
        className={`${styles.compactSelect} ${styles.providerSelect}`}
        size="sm"
        leadingIcon={<Settings2 size={12} />}
        aria-label={t('modelSelect.provider')}
        title={t('modelSelect.provider')}
        value={modelControls.selectedProviderProfile?.id || ''}
        disabled={state.activeChat.busy}
        onChange={(event) => modelControls.selectProviderProfile({ profileId: event.target.value })}
        options={modelControls.providerOptions}
      />
      <Select
        className={`${styles.compactSelect} ${styles.modelSelect}`}
        size="sm"
        leadingIcon={<Cpu size={12} />}
        aria-label={t('summary.model')}
        title={t('summary.model')}
        value={modelControls.modelValue}
        placeholder={
          modelControls.providerModelOptions.length ? t('modelSelect.chooseModel') : t('modelSelect.loadingModels')
        }
        disabled={state.activeChat.busy || !modelControls.providerModelOptions.length}
        onChange={(event) => agentActions.setChatModelSettings({ model: event.target.value })}
        options={modelControls.providerModelOptions}
        displayLabels={modelControls.modelDisplayLabels}
      />
      <Select
        className={`${styles.compactSelect} ${styles.reasoningCompactSelect}`}
        size="sm"
        leadingIcon={<Brain size={12} />}
        aria-label={t('summary.reasoningEffort')}
        title={t('summary.reasoningEffort')}
        value={modelControls.chatModelSettings.reasoningEffort}
        disabled={state.activeChat.busy}
        onChange={(event) =>
          agentActions.setChatModelSettings({ reasoningEffort: event.target.value as ReasoningEffort })
        }
        options={getReasoningOptions({ model: modelControls.activeModel })}
        displayLabels={REASONING_DISPLAY_LABELS}
      />
      {modelControls.codexServiceTierOptions ? (
        <Select
          className={`${styles.compactSelect} ${styles.speedCompactSelect}`}
          size="sm"
          leadingIcon={<Settings2 size={12} />}
          aria-label="Codex speed"
          title="Codex speed"
          value={modelControls.chatModelSettings.codexServiceTier}
          disabled={state.activeChat.busy}
          onChange={(event) =>
            agentActions.setChatModelSettings({ codexServiceTier: event.target.value as CodexServiceTier })
          }
          options={modelControls.codexServiceTierOptions}
          displayLabels={CODEX_TIER_DISPLAY_LABELS}
        />
      ) : null}
      {modelControls.modelSettingsModified ? (
        <CompactNavigationButton
          icon={<RotateCcw size={12} />}
          title={t('settings.resetChatModelSettings')}
          disabled={state.activeChat.busy}
          onClick={() => agentActions.resetChatModelSettings()}
        />
      ) : null}
    </div>
  );
});

/**
 * Что это: кнопка открытия меню модели со всей важной сводкой в подписи.
 * Зачем нужно: пользователь видит текущую рабочую модель без пяти отдельных селектов в нижней части composer.
 */
export const ModelSettingsToggleButton = memo(function ModelSettingsToggleButton({
  state,
  open,
  onToggle
}: {
  state: AgentState;
  open: boolean;
  onToggle(): void;
}) {
  const { t } = useI18n();
  const label = getModelSettingsSummaryLabel({ state });
  const title = `${open ? 'Hide' : 'Show'} model controls: ${getModelSettingsTitle({ state })}`;

  return (
    <CompactNavigationButton
      className={open ? `${styles.modelSummaryButton} ${styles.modelSummaryButtonOpen}` : styles.modelSummaryButton}
      icon={<Cpu size={12} />}
      label={label || t('summary.model')}
      title={title}
      disabled={state.activeChat.busy}
      onClick={onToggle}
    />
  );
});

const ComposerContextControls = memo(function ComposerContextControls({ state }: { state: AgentState }) {
  const { t } = useI18n();
  const [compactingChatId, setCompactingChatId] = useState<string | undefined>();
  const compacting = compactingChatId === state.activeChat.id;

  useEffect(() => {
    if (compactingChatId && state.activeChat.id !== compactingChatId) {
      setCompactingChatId(undefined);
    }
  }, [compactingChatId, state.activeChat.id]);

  return (
    <CompactControlGroup inline>
      <CompactNavigationButton
        className={styles.compactChatButton}
        icon={compacting ? <LoaderCircle className={styles.compactionSpinner} size={12} /> : <Archive size={12} />}
        title={t('summary.compactTitle')}
        disabled={state.activeChat.busy || compacting}
        onClick={() => {
          setCompactingChatId(state.activeChat.id);
          agentActions.compactChat(state.activeChat.id);
        }}
      />
      <ContextUsage context={state.activeChat.context} />
    </CompactControlGroup>
  );
});

type Translate = ReturnType<typeof useI18n>['t'];

function usePermissionOptions({ state, t }: { state: AgentState; t: Translate }): SelectOption[] {
  return useMemo(
    () => [
      ...(state.activeToolPermissionPresetId === 'custom' ? [{ value: 'custom', label: t('common.custom') }] : []),
      ...state.toolPermissionPresets.map((preset) => ({
        value: preset.id,
        label: t(`settings.preset.${preset.id}.label` as never)
      }))
    ],
    [state.activeToolPermissionPresetId, state.toolPermissionPresets, t]
  );
}

function useModelControls({ state }: { state: AgentState }) {
  const [selectedProviderProfileId, setSelectedProviderProfileId] = useState<string | undefined>();
  const activeProvider = getActiveModelProvider(
    state.activeChat.modelSettings.model,
    state.models,
    state.providerProfiles
  );
  const selectedProviderProfile = getSelectedProviderProfile(
    state.providerProfiles,
    selectedProviderProfileId,
    activeProvider
  );
  const providerOptions = useMemo(() => getProviderOptions(state.providerProfiles), [state.providerProfiles]);
  const providerModelOptions = useMemo(
    () => getProviderModelOptions(state.models, selectedProviderProfile?.provider || activeProvider),
    [activeProvider, selectedProviderProfile?.provider, state.models]
  );
  const modelDisplayLabels = useMemo(() => getModelDisplayLabels(providerModelOptions), [providerModelOptions]);
  const chatModelSettings = state.activeChat.modelSettings;
  const activeModel = state.models.find((model) => model.id === chatModelSettings.model);
  const codexServiceTierOptions = getCodexServiceTierOptions(activeModel);
  const modelSettingsModified = !areModelSettingsEqual(chatModelSettings, state.defaultModelSettings);

  useEffect(() => {
    if (!selectedProviderProfile || state.activeChat.busy) {
      return;
    }

    if (!providerModelOptions.length) {
      agentActions.refreshModelsForProvider(selectedProviderProfile.provider);
    }
  }, [providerModelOptions.length, selectedProviderProfile, state.activeChat.busy]);

  function selectProviderProfile({ profileId }: { profileId: string }) {
    const nextProfile = state.providerProfiles.find((profile) => profile.id === profileId);
    setSelectedProviderProfileId(nextProfile?.id);
    if (nextProfile) {
      agentActions.refreshModelsForProvider(nextProfile.provider);
    }
  }

  return {
    selectedProviderProfile,
    providerOptions,
    providerModelOptions,
    modelDisplayLabels,
    chatModelSettings,
    activeModel,
    codexServiceTierOptions,
    modelSettingsModified,
    modelValue: providerModelOptions.some((option) => option.value === chatModelSettings.model)
      ? chatModelSettings.model
      : '',
    selectProviderProfile
  };
}

function getModelSettingsSummaryLabel({ state }: { state: AgentState }): string {
  const provider = getModelProviderLabel({ state });
  const model = compactModelLabel(getModelLabel({ state }));
  const reasoning = REASONING_DISPLAY_LABELS[state.activeChat.modelSettings.reasoningEffort];
  const speed = CODEX_TIER_DISPLAY_LABELS[state.activeChat.modelSettings.codexServiceTier];

  return [provider, model, reasoning, speed].filter(Boolean).join(' · ');
}

function getModelSettingsTitle({ state }: { state: AgentState }): string {
  const provider = getModelProviderLabel({ state });
  const model = getModelLabel({ state });
  const reasoning = REASONING_DISPLAY_LABELS[state.activeChat.modelSettings.reasoningEffort];
  const speed = CODEX_TIER_DISPLAY_LABELS[state.activeChat.modelSettings.codexServiceTier];

  return `Provider: ${provider}\nModel: ${model}\nReasoning: ${reasoning}\nSpeed: ${speed}`;
}

function getModelProviderLabel({ state }: { state: AgentState }): string {
  const activeModel = state.models.find((model) => model.id === state.activeChat.modelSettings.model);
  const provider =
    activeModel?.provider ||
    getActiveModelProvider(state.activeChat.modelSettings.model, state.models, state.providerProfiles);
  const profile = state.providerProfiles.find((item) => item.provider === provider);

  return profile?.name || provider || 'Provider';
}

function getModelLabel({ state }: { state: AgentState }): string {
  const activeModel = state.models.find((model) => model.id === state.activeChat.modelSettings.model);
  return activeModel?.name || state.activeChat.modelSettings.model;
}

function areModelSettingsEqual(
  left: AgentState['activeChat']['modelSettings'],
  right: AgentState['defaultModelSettings']
): boolean {
  return (
    left.model === right.model &&
    left.reasoningEffort === right.reasoningEffort &&
    left.codexServiceTier === right.codexServiceTier &&
    left.maxToolIterations === right.maxToolIterations &&
    left.editorContextMode === right.editorContextMode &&
    left.streamingEnabled === right.streamingEnabled
  );
}

export function getReasoningOptions({ model }: { model: ModelOption | undefined }): SelectOption[] {
  const baseOptions: SelectOption[] = [
    { value: 'auto', label: 'auto' },
    { value: 'low', label: 'low' },
    { value: 'medium', label: 'medium' },
    { value: 'high', label: 'high' }
  ];

  return model?.provider === 'codex' ? [...baseOptions, { value: 'xhigh', label: 'xhigh' }] : baseOptions;
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
    { value: 'auto', label: 'normal' },
    { value: 'priority', label: 'priority' }
  ];
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

function formatInstructionProfileLabel(role: string, preset: string, instructionCount: number): string {
  const normalizedPreset = preset.trim();
  const suffix = instructionCount ? ` +${instructionCount}` : '';
  if (!normalizedPreset || /^no preset|активный пресет не выбран/i.test(normalizedPreset)) {
    return `${role}${suffix}`;
  }

  return `${role} / ${normalizedPreset}${suffix}`;
}

const ContextUsage = memo(function ContextUsage({ context }: { context: ChatContextEstimate | undefined }) {
  const { t } = useI18n();
  const tokens = context?.tokens ?? 0;
  const tooltip = formatContextTooltip(context, t('common.notAvailable'));

  return (
    <ContextUsageIndicator
      value={tokens}
      percent={clampPercent(context?.percent ?? 0)}
      tooltip={tooltip}
      formatter={formatTokens}
    />
  );
});

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

function formatContextTooltip(context: ChatContextEstimate | undefined, fallback: string): string {
  if (!context?.tokens) {
    return fallback;
  }

  const tokens = formatTokens(context.tokens);
  const percent = context.percent !== undefined ? `${Math.round(context.percent)}%` : fallback;

  if (!context.maxTokens) {
    return `${tokens} tokens · ${percent}`;
  }

  return `${tokens} of ${formatTokens(context.maxTokens)} tokens · ${percent}`;
}

function getModelDisplayLabels(options: SelectOption[]): Record<string, string> {
  return Object.fromEntries(options.map((option) => [option.value, compactModelLabel(option.label)]));
}

function compactModelLabel(label: string): string {
  return label
    .replace(/^openrouter[:/]/i, '')
    .replace(/^anthropic[:/]/i, '')
    .replace(/^openai[:/]/i, '')
    .replace(/^google[:/]/i, '')
    .replace(/^meta-llama[:/]/i, '')
    .replace(/^codex[:/]/i, '')
    .replace(/\bchatgpt\b/gi, 'GPT')
    .replace(/\bclaude\b/gi, 'Cl')
    .replace(/\bgemini\b/gi, 'Gem')
    .replace(/\s+/g, ' ')
    .trim();
}

function getPermissionDisplayLabels(
  options: SelectOption[],
  activePresetId: ToolPermissionPresetId | 'custom'
): Record<string, string> {
  return Object.fromEntries(
    options.map((option) => [option.value, compactPermissionLabel(option.value, option.label, activePresetId)])
  );
}

function compactPermissionLabel(
  value: string,
  label: string,
  activePresetId: ToolPermissionPresetId | 'custom'
): string {
  if (value === 'custom' || activePresetId === 'custom') return 'Custom';
  if (value === 'confirm-all') return 'Ask';
  if (value === 'balanced') return 'Safe';
  if (value === 'fast-edit') return 'Edit';
  if (value === 'autonomous') return 'Auto';
  return label.replace(/\s+/g, '').slice(0, 5) || value.slice(0, 5);
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
