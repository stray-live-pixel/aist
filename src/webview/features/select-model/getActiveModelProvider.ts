import type { ModelOption, ProviderProfile } from '../../shared/types';

/**
 * Что это: определяет активного провайдера по текущей модели и списку профилей.
 * Зачем нужно: UI сначала показывает provider, а модель может прийти раньше каталога; fallback по префиксу codex
 * сохраняет консистентный выбор без сетевого запроса ко всем провайдерам.
 */
export function getActiveModelProvider(
  modelId: string,
  models: ModelOption[],
  profiles: ProviderProfile[]
): ProviderProfile['provider'] {
  const catalogModel = models.find((model) => model.id === modelId);
  if (catalogModel?.provider) {
    return catalogModel.provider;
  }

  if (modelId.startsWith('codex:')) {
    return 'codex';
  }

  return profiles[0]?.provider || 'openrouter';
}
