import { FALLBACK_MODEL_OPTIONS } from '../../core/entities/model/modelDefaults';
import type { ModelProvider, OpenRouterModelOption } from '../../core/shared/types/types';

/**
 * Что это: возвращает known model option или synthetic option для неизвестной модели.
 * Зачем нужно: runtime должен знать provider и tools support даже для пользовательского model id.
 * Какую продуктовую проблему решает: пользователь может указать custom model без падения daemon.
 */
export function getDaemonModelOption({ modelId }: { modelId: string }): OpenRouterModelOption {
  const known = FALLBACK_MODEL_OPTIONS.find((model) => model.id === modelId);
  if (known) {
    return known;
  }

  return {
    id: modelId,
    name: modelId,
    provider: modelId.startsWith('codex:') ? 'codex' : 'openrouter',
    supportsTools: true
  };
}

/**
 * Что это: отдаёт статический fallback список моделей для provider.
 * Зачем нужно: models.list должен работать даже без сети/API key.
 * Какую продуктовую проблему решает: пользователь видит базовые модели до настройки provider credentials.
 */
export function fallbackModels({ provider }: { provider: ModelProvider }): {
  readonly fallback: true;
  readonly models: readonly OpenRouterModelOption[];
} {
  return { fallback: true, models: FALLBACK_MODEL_OPTIONS.filter((model) => model.provider === provider) };
}

/**
 * Что это: удаляет дубли моделей и сортирует их по id.
 * Зачем нужно: provider/fallback списки могут пересекаться.
 * Какую продуктовую проблему решает: UI моделей стабилен и не показывает одну модель несколько раз.
 */
export function dedupeAndSortModels({ models }: { models: readonly OpenRouterModelOption[] }): OpenRouterModelOption[] {
  const byId = new Map<string, OpenRouterModelOption>();
  for (const model of models) {
    byId.set(model.id, model);
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}
