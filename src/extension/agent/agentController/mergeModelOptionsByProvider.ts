import type { ModelProvider, OpenRouterModelOption } from '../../../core/shared/types/types';

/**
 * Что это: заменяет модели одного provider в общем списке model options.
 * Зачем нужно: refresh provider не должен стирать модели других провайдеров.
 * Какую продуктовую проблему решает: settings UI остаётся полным после точечного обновления моделей.
 */
export function mergeModelOptionsByProvider({
  current,
  loaded,
  provider
}: {
  current: OpenRouterModelOption[];
  loaded: OpenRouterModelOption[];
  provider: ModelProvider;
}): OpenRouterModelOption[] {
  const retained = current.filter((model) => (model.provider || 'openrouter') !== provider);
  const byId = new Map<string, OpenRouterModelOption>();
  for (const model of [...retained, ...loaded]) {
    byId.set(model.id, model);
  }
  return [...byId.values()];
}
