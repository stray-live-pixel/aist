import { Brain, Cpu, FileText, RadioTower, ShieldCheck } from 'lucide-react';
import { memo, useMemo } from 'react';

import { type TranslationKey, useI18n } from '../../shared/i18n';
import { agentActions } from '../../shared/lib/agentActions';
import type {
  AgentState,
  ChatModelSettings,
  EditorContextMode,
  ModelOption,
  ReasoningEffort
} from '../../shared/types';
import { Card, Select, type SelectCategory, type SelectOption, Switch, Text } from '../../shared/ui';
import styles from './RequestSettingsPanel.module.scss';

type RequestSettingsPanelProps = {
  state: AgentState;
  compact?: boolean;
  scope?: 'chat' | 'default';
};

/**
 * Что это: единая карточка настроек следующего запроса агента.
 * Зачем нужно: в chat scope меняет параметры текущего чата, а в default scope — только defaults для новых чатов.
 */
export const RequestSettingsPanel = memo(function RequestSettingsPanel({
  state,
  compact = false,
  scope = 'chat'
}: RequestSettingsPanelProps) {
  const { t } = useI18n();
  const disabled = scope === 'chat' && state.activeChat.busy;
  const settings = scope === 'chat' ? state.activeChat.modelSettings : state.defaultModelSettings;
  const modelOptions = useMemo(() => getModelOptions(state, settings.model), [state.models, settings.model]);
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
  const updateSettings = getSettingsUpdater(scope);

  return (
    <Card
      className={compact ? styles.cardCompact : undefined}
      tone="elevated"
      title={t(scope === 'default' ? 'settings.defaultRequestTitle' : 'settings.requestTitle')}
      description={scope === 'default' ? undefined : t('settings.requestDescription')}
    >
      <div className={styles.grid}>
        <Select
          label={t('summary.model')}
          leadingIcon={<Cpu size={14} />}
          value={settings.model}
          disabled={disabled}
          onChange={(event) => updateSettings({ model: event.target.value })}
          options={modelOptions}
          categories={modelCategories}
          searchable
        />
        <Select
          label={t('settings.permission.access')}
          leadingIcon={<ShieldCheck size={14} />}
          value={state.activeToolPermissionPresetId}
          disabled={disabled}
          title={getSelectedPermissionDescription(state, t)}
          onChange={(event) => {
            if (event.target.value !== 'custom') {
              agentActions.setToolPermissionPreset(event.target.value);
            }
          }}
          options={permissionOptions}
          searchable={false}
        />
        <Select
          label={t('summary.reasoningEffort')}
          leadingIcon={<Brain size={14} />}
          value={settings.reasoningEffort}
          disabled={disabled}
          onChange={(event) => updateSettings({ reasoningEffort: event.target.value as ReasoningEffort })}
          options={getReasoningOptions(t)}
          searchable={false}
        />
        <Select
          label={t('settings.editorContextTitle')}
          leadingIcon={<FileText size={14} />}
          value={settings.editorContextMode}
          disabled={disabled}
          onChange={(event) => updateSettings({ editorContextMode: event.target.value as EditorContextMode })}
          options={getEditorContextOptions(t)}
          searchable={false}
        />
        <Switch
          className={styles.streamingSwitch}
          label={t('settings.streamingTitle')}
          description={settings.streamingEnabled ? t('settings.streamingOn') : t('settings.streamingDescription')}
          checked={settings.streamingEnabled}
          disabled={disabled}
          onChange={(event) => updateSettings({ streamingEnabled: event.target.checked })}
        />
        <div className={styles.streamingSummary}>
          <RadioTower size={14} />
          <Text variant="caption">
            {settings.streamingEnabled ? t('settings.streamingOn') : t('settings.streamingOff')}
          </Text>
        </div>
      </div>
    </Card>
  );
});

function getSettingsUpdater(scope: 'chat' | 'default'): (patch: Partial<ChatModelSettings>) => void {
  if (scope === 'chat') {
    return (patch) => agentActions.setChatModelSettings(patch);
  }

  return (patch) => {
    if (patch.model !== undefined) agentActions.setDefaultModel(patch.model);
    if (patch.reasoningEffort !== undefined) agentActions.setReasoningEffort(patch.reasoningEffort);
    if (patch.codexServiceTier !== undefined) agentActions.setCodexServiceTier(patch.codexServiceTier);
    if (patch.maxToolIterations !== undefined) agentActions.setMaxToolIterations(patch.maxToolIterations);
    if (patch.editorContextMode !== undefined) agentActions.setEditorContextMode(patch.editorContextMode);
    if (patch.streamingEnabled !== undefined) agentActions.setStreamingEnabled(patch.streamingEnabled);
  };
}

function getModelOptions(state: AgentState, currentModel: string): SelectOption[] {
  return state.models.length
    ? state.models.map((model) => ({
        value: model.id,
        label: `${model.name} (${model.id})`,
        category: model.provider || 'openrouter'
      }))
    : [{ value: currentModel, label: currentModel }];
}

function getModelCategories(models: ModelOption[]): SelectCategory[] {
  const providers = new Set(models.map((model) => model.provider || 'openrouter'));
  const categories: SelectCategory[] = [
    { id: 'openrouter', label: 'OpenRouter' },
    { id: 'codex', label: 'ChatGPT Codex' }
  ];
  return categories.filter((category) => providers.has(category.id as NonNullable<ModelOption['provider']>));
}

function getReasoningOptions(t: (key: TranslationKey) => string): SelectOption[] {
  return [
    { value: 'auto', label: t('reasoning.auto') },
    { value: 'low', label: t('reasoning.low') },
    { value: 'medium', label: t('reasoning.medium') },
    { value: 'high', label: t('reasoning.high') }
  ];
}

function getEditorContextOptions(t: (key: TranslationKey) => string): SelectOption[] {
  return [
    { value: 'auto', label: t('editorContext.auto') },
    { value: 'selection', label: t('editorContext.selection') },
    { value: 'file', label: t('editorContext.file') },
    { value: 'off', label: t('editorContext.off') }
  ];
}

function getSelectedPermissionDescription(state: AgentState, t: (key: TranslationKey) => string): string {
  if (state.activeToolPermissionPresetId === 'custom') {
    return t('settings.permission.customDescription');
  }

  const preset = state.toolPermissionPresets.find((item) => item.id === state.activeToolPermissionPresetId);
  return preset ? t(`settings.preset.${preset.id}.description` as never) : '';
}
