import { Brain, Cpu, FileText, RadioTower, ShieldCheck } from 'lucide-react';
import { memo, useMemo } from 'react';

import { type TranslationKey, useI18n } from '../../shared/i18n';
import { agentActions } from '../../shared/lib/agentActions';
import type { AgentState, EditorContextMode, ModelOption, ReasoningEffort } from '../../shared/types';
import { Card, Select, type SelectCategory, type SelectOption, Switch, Text } from '../../shared/ui';
import styles from './RequestSettingsPanel.module.scss';

type RequestSettingsPanelProps = {
  state: AgentState;
  compact?: boolean;
};

/**
 * Что это: единая карточка настроек следующего запроса агента.
 * Зачем нужно: composer остаётся визуально лёгким, а модель, доступ, reasoning, контекст и streaming доступны из summary и overview настроек.
 */
export const RequestSettingsPanel = memo(function RequestSettingsPanel({
  state,
  compact = false
}: RequestSettingsPanelProps) {
  const { t } = useI18n();
  const disabled = state.activeChat.busy;
  const modelOptions = useMemo(() => getModelOptions(state), [state.models, state.activeChat.model]);
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
    <Card
      className={compact ? styles.cardCompact : undefined}
      tone="elevated"
      title={t('settings.requestTitle')}
      description={t('settings.requestDescription')}
    >
      <div className={styles.grid}>
        <Select
          label={t('summary.model')}
          leadingIcon={<Cpu size={14} />}
          value={state.activeChat.model}
          disabled={disabled}
          onChange={(event) => agentActions.setModel(event.target.value)}
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
          value={state.reasoningEffort}
          disabled={disabled}
          onChange={(event) => agentActions.setReasoningEffort(event.target.value as ReasoningEffort)}
          options={getReasoningOptions(t)}
          searchable={false}
        />
        <Select
          label={t('settings.editorContextTitle')}
          leadingIcon={<FileText size={14} />}
          value={state.editorContextMode}
          disabled={disabled}
          onChange={(event) => agentActions.setEditorContextMode(event.target.value as EditorContextMode)}
          options={getEditorContextOptions(t)}
          searchable={false}
        />
        <Switch
          className={styles.streamingSwitch}
          label={t('settings.streamingTitle')}
          description={state.streamingEnabled ? t('settings.streamingOn') : t('settings.streamingDescription')}
          checked={state.streamingEnabled}
          disabled={disabled}
          onChange={(event) => agentActions.setStreamingEnabled(event.target.checked)}
        />
        <div className={styles.streamingSummary}>
          <RadioTower size={14} />
          <Text variant="caption">
            {state.streamingEnabled ? t('settings.streamingOn') : t('settings.streamingOff')}
          </Text>
        </div>
      </div>
    </Card>
  );
});

function getModelOptions(state: AgentState): SelectOption[] {
  return state.models.length
    ? state.models.map((model) => ({
        value: model.id,
        label: `${model.name} (${model.id})`,
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
