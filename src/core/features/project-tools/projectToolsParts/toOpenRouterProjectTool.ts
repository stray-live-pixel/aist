import { type OpenRouterTool } from '../../../shared/types/types';
import { ProjectToolDefinition } from './ProjectToolDefinition';

export function toOpenRouterProjectTool(definition: ProjectToolDefinition): OpenRouterTool {
  return {
    type: 'function',
    function: {
      name: definition.id,
      description: definition.description || definition.label,
      parameters: definition.inputSchema
    }
  };
}
