import { type OpenRouterTool } from '../../../shared/types/types';
import { discoverProjectTools, executeProjectTool } from '../../project-tools/projectTools';

export type ToolRegistryImplementationOptions = {
  builtinTools?: readonly OpenRouterTool[];
  planningToolDefinitions?: readonly OpenRouterTool[];
  skillTool?: OpenRouterTool;
  modelTool?: OpenRouterTool;
  discoverProjectTools?: typeof discoverProjectTools;
  executeProjectTool?: typeof executeProjectTool;
};
