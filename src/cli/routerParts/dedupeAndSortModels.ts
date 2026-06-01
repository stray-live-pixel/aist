import { type OpenRouterModelOption } from '../../core/shared/types/types';

export function dedupeAndSortModels(models: readonly OpenRouterModelOption[]): OpenRouterModelOption[] {
  const byId = new Map<string, OpenRouterModelOption>();
  for (const model of models) {
    byId.set(model.id, model);
  }

  return [...byId.values()].sort((left, right) => {
    const providerOrder = left.provider.localeCompare(right.provider);
    return providerOrder === 0 ? left.name.localeCompare(right.name) : providerOrder;
  });
}
