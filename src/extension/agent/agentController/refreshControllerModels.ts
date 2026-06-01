import { FALLBACK_MODEL_OPTIONS } from '../../../core/entities/model/modelDefaults';
import type { ModelProvider } from '../../../core/shared/types/types';
import type { AgentControllerCallbacks } from './AgentControllerCallbacks';
import type { AgentControllerState } from './AgentControllerState';
import { mergeModelOptionsByProvider } from './mergeModelOptionsByProvider';

/**
 * Что это: обновляет model options из daemon и отправляет state в webview.
 * Зачем нужно: список моделей кэшируется daemon, а UI хранит локальный snapshot.
 * Какую продуктовую проблему решает: настройки модели показывают актуальные варианты провайдеров.
 */
export async function refreshControllerModels({
  state,
  callbacks,
  force = false,
  provider = 'all'
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
  force?: boolean;
  provider?: ModelProvider | 'all';
}): Promise<void> {
  try {
    const loadedModels = [...(await state.daemonRuntime.refreshModels(force, provider))];
    state.modelOptions =
      provider === 'all'
        ? loadedModels
        : mergeModelOptionsByProvider({ current: state.modelOptions, loaded: loadedModels, provider });
  } catch (error) {
    state.logger.error('Failed to refresh models from daemon', error);
    state.modelOptions = provider === 'all' ? [...FALLBACK_MODEL_OPTIONS] : state.modelOptions;
  }
  callbacks.sendState();
}
