import { type OpenRouterTool } from '../../../shared/types/types';

export function toCodexTool(tool: OpenRouterTool): Record<string, unknown> {
  return {
    type: 'function',
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters
  };
}
