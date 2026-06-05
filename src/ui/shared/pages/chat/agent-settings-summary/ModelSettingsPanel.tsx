import { Brain, Cpu, RotateCcw, Settings2 } from 'lucide-react';
import { memo } from 'react';

import { useI18n } from '../../../i18n';
import { agentActions } from '../../../lib/agentActions';
import type { AgentState, CodexServiceTier, ReasoningEffort } from '../../../types';
import { CompactNavigationButton, Select } from '../../../ui';
import styles from '../ChatPage.module.scss';
import { getReasoningOptions } from './getReasoningOptions';
import { CODEX_TIER_DISPLAY_LABELS, REASONING_DISPLAY_LABELS } from './modelDisplayLabels';
import { useModelControls } from './useModelControls';

/**
 * Что это: плавающая панель основных настроек рабочей модели.
 * Зачем нужно: переносит provider/model/reasoning/speed из нижней строки composer в раскрываемое меню.
 * Какую проблему решает: редко меняемые настройки доступны рядом с composer, но не занимают постоянное место.
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
