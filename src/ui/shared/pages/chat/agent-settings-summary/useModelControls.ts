import { useEffect, useMemo, useState } from 'react';

import {
  getActiveModelProvider,
  getProviderModelOptions,
  getProviderOptions,
  getSelectedProviderProfile
} from '../../../features/select-model';
import { agentActions } from '../../../lib/agentActions';
import type { AgentState } from '../../../types';
import { areModelSettingsEqual } from './areModelSettingsEqual';
import { getModelDisplayLabels } from './formatters';
import { getCodexServiceTierOptions } from './getCodexServiceTierOptions';

/**
 * Что это: собирает все данные для панели выбора provider/model/reasoning.
 * Зачем нужно: компонент панели остаётся декларативным и не знает деталей загрузки моделей.
 * Какую проблему решает: изменение логики provider profiles не требует править JSX controls.
 */
export function useModelControls({ state }: { state: AgentState }) {
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
  const modelDisplayLabels = useMemo(
    () => getModelDisplayLabels({ options: providerModelOptions }),
    [providerModelOptions]
  );
  const chatModelSettings = state.activeChat.modelSettings;
  const activeModel = state.models.find((model) => model.id === chatModelSettings.model);
  const codexServiceTierOptions = getCodexServiceTierOptions({ model: activeModel });
  const modelSettingsModified = !areModelSettingsEqual({ left: chatModelSettings, right: state.defaultModelSettings });

  useEffect(() => {
    if (!selectedProviderProfile || state.activeChat.busy) {
      return;
    }

    if (!providerModelOptions.length) {
      agentActions.refreshModelsForProvider(selectedProviderProfile.provider);
    }
  }, [providerModelOptions.length, selectedProviderProfile, state.activeChat.busy]);

  /**
   * Что это: выбирает provider profile и заранее запускает обновление моделей провайдера.
   * Зачем нужно: список моделей появляется без отдельного пользовательского действия.
   * Какую проблему решает: переключение provider не оставляет пустой список моделей надолго.
   */
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
