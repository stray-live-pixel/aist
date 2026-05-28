import type { OpenRouterModelOption } from '../../../core/shared/types/types';

/**
 * Объединяет модели провайдеров и гарантирует наличие уже выбранных моделей.
 *
 * Это нужно для случая, когда сохраненная в настройках/чате модель временно не
 * пришла из API. UI все равно сможет показать текущий выбор, а пользователь —
 * сменить его без потери состояния.
 */
export function mergeModels(models: OpenRouterModelOption[], ...selectedModels: string[]): OpenRouterModelOption[] {
  const byId = new Map<string, OpenRouterModelOption>();

  for (const model of models) {
    byId.set(model.id, model);
  }

  for (const modelId of selectedModels) {
    if (!byId.has(modelId)) {
      byId.set(modelId, {
        id: modelId,
        name: modelId,
        provider: isCodexModel(modelId) ? 'codex' : 'openrouter',
        supportsTools: true,
        ...(isCodexModel(modelId) ? { codexServiceTiers: ['priority' as const] } : {})
      });
    }
  }

  return [...byId.values()];
}

export function isCodexModel(modelId: string | undefined): boolean {
  return Boolean(modelId?.startsWith('codex:'));
}
