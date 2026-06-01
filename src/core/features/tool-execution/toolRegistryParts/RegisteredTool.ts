import { type OpenRouterTool } from '../../../shared/types/types';
import { type ProjectToolDefinition } from '../../project-tools/projectTools';
import { ToolKind } from './ToolKind';

export type RegisteredTool = {
  name: string;
  kind: ToolKind;
  definition?: ProjectToolDefinition;
  tool: OpenRouterTool;
};
