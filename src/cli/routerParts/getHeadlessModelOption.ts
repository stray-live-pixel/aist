import { FALLBACK_MODEL_OPTIONS } from '../../core/entities/model/modelDefaults';
import { type OpenRouterModelOption } from '../../core/shared/types/types';

export function getHeadlessModelOption(modelId: string): OpenRouterModelOption {
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
