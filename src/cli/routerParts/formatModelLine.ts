import { type OpenRouterModelOption } from '../../core/shared/types/types';

export function formatModelLine(model: OpenRouterModelOption): string {
  const context = model.contextLength === undefined ? 'context unknown' : `context ${model.contextLength}`;
  const tools = model.supportsTools ? 'tools' : 'no tools';
  return `- [${model.provider}] ${model.id} - ${model.name} (${tools}, ${context})`;
}
