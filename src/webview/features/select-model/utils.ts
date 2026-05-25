import type { ModelOption } from '../../shared/types';
import type { ModelProviderGroup } from './types';

/**
 * Что это: человекочитаемое имя провайдера модели.
 * Зачем нужно: один и тот же label нужен и для групп, и для поиска по провайдеру.
 */
export function getProviderLabel(provider: ModelOption['provider']): string {
  return provider === 'codex' ? 'ChatGPT Codex' : 'OpenRouter';
}

/**
 * Что это: безопасная выбранная модель, даже если id ещё не пришёл в списке models.
 * Зачем нужно: settings могут загрузиться раньше каталога моделей; UI должен показывать текущий id без пустого состояния.
 */
export function getSelectedModel(model: string, models: ModelOption[]): ModelOption {
  return (
    models.find((item) => item.id === model) || {
      id: model,
      name: model,
      provider: model.startsWith('codex:') ? 'codex' : 'openrouter',
      supportsTools: true
    }
  );
}

/**
 * Что это: фильтрация моделей по текстовому запросу.
 * Зачем нужно: поиск должен учитывать имя, id и provider, но не должен мутировать исходный список fixtures/состояния.
 */
export function filterModels(models: ModelOption[], query: string): ModelOption[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return models;
  }

  return models.filter((item) =>
    `${item.name} ${item.id} ${getProviderLabel(item.provider)}`.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Что это: группировка моделей по провайдеру в порядке, ожидаемом UI.
 * Зачем нужно: список провайдеров маленький и фиксированный, поэтому явный порядок проще и стабильнее сортировки по данным.
 */
export function groupModelsByProvider(models: ModelOption[]): ModelProviderGroup[] {
  return [
    {
      provider: 'openrouter' as const,
      label: 'OpenRouter',
      options: models.filter((item) => (item.provider || 'openrouter') === 'openrouter')
    },
    {
      provider: 'codex' as const,
      label: 'ChatGPT Codex',
      options: models.filter((item) => item.provider === 'codex')
    }
  ].filter((group) => group.options.length);
}
