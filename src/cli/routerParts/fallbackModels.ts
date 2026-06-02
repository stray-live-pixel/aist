import { FALLBACK_MODEL_OPTIONS } from '../../core/entities/model/modelDefaults';
import { type ModelProvider, type OpenRouterModelOption } from '../../core/shared/types/types';

export function fallbackModels(provider: ModelProvider): {
  readonly fallback: true;
  readonly models: readonly OpenRouterModelOption[];
} {
  return {
    fallback: true,
    models: FALLBACK_MODEL_OPTIONS.filter((model) => model.provider === provider)
  };
}
