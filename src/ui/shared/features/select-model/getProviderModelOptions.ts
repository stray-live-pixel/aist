import type { ModelOption, ProviderProfile } from '../../shared/types';
import type { SelectOption } from '../../shared/ui';

/**
 * Что это: возвращает модели только базового провайдера выбранного профиля.
 * Зачем нужно: один OpenRouter-профиль не должен провоцировать загрузку моделей остальных профилей; список моделей
 * переиспользуется для провайдера, а сетевой маршрут выбирается отдельно через профиль.
 */
export function getProviderModelOptions(models: ModelOption[], provider: ProviderProfile['provider']): SelectOption[] {
  return models
    .filter((model) => (model.provider || 'openrouter') === provider)
    .map((model) => ({
      value: model.id,
      label: model.name
    }));
}
