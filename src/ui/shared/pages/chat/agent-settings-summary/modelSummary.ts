import { getActiveModelProvider } from '../../../features/select-model';
import type { AgentState } from '../../../types';
import { compactModelLabel } from './formatters';
import { CODEX_TIER_DISPLAY_LABELS, REASONING_DISPLAY_LABELS } from './modelDisplayLabels';

/**
 * Что это: собирает короткую подпись текущих model settings.
 * Зачем нужно: toggle-кнопка показывает модель, провайдера, reasoning и скорость в одной строке.
 * Какую проблему решает: пользователь понимает активную конфигурацию без раскрытия панели.
 */
export function getModelSettingsSummaryLabel({ state }: { state: AgentState }): string {
  const provider = getModelProviderLabel({ state });
  const model = compactModelLabel({ label: getModelLabel({ state }) });
  const reasoning = REASONING_DISPLAY_LABELS[state.activeChat.modelSettings.reasoningEffort];
  const speed = CODEX_TIER_DISPLAY_LABELS[state.activeChat.modelSettings.codexServiceTier];

  return [provider, model, reasoning, speed].filter(Boolean).join(' · ');
}

/**
 * Что это: собирает подробную подсказку для model settings toggle.
 * Зачем нужно: hover/focus title показывает полные названия без ограничения compact layout.
 * Какую проблему решает: сокращённая подпись остаётся понятной и доступной.
 */
export function getModelSettingsTitle({ state }: { state: AgentState }): string {
  const provider = getModelProviderLabel({ state });
  const model = getModelLabel({ state });
  const reasoning = REASONING_DISPLAY_LABELS[state.activeChat.modelSettings.reasoningEffort];
  const speed = CODEX_TIER_DISPLAY_LABELS[state.activeChat.modelSettings.codexServiceTier];

  return `Provider: ${provider}\nModel: ${model}\nReasoning: ${reasoning}\nSpeed: ${speed}`;
}

/**
 * Что это: находит человекочитаемое имя активного провайдера.
 * Зачем нужно: summary показывает профиль провайдера, а не только технический id.
 * Какую проблему решает: пользователю проще отличать встроенные и корпоративные provider profiles.
 */
export function getModelProviderLabel({ state }: { state: AgentState }): string {
  const activeModel = state.models.find((model) => model.id === state.activeChat.modelSettings.model);
  const provider =
    activeModel?.provider ||
    getActiveModelProvider(state.activeChat.modelSettings.model, state.models, state.providerProfiles);
  const profile = state.providerProfiles.find((item) => item.provider === provider);

  return profile?.name || provider || 'Provider';
}

/**
 * Что это: находит человекочитаемое имя активной модели.
 * Зачем нужно: summary предпочитает label из каталога моделей, если он уже загружен.
 * Какую проблему решает: пользователь видит понятное имя вместо сырого id там, где возможно.
 */
export function getModelLabel({ state }: { state: AgentState }): string {
  const activeModel = state.models.find((model) => model.id === state.activeChat.modelSettings.model);
  return activeModel?.name || state.activeChat.modelSettings.model;
}
