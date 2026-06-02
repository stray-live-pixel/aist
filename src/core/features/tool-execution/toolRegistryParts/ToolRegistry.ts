import { type ProjectToolDefinition } from '../../project-tools/projectTools';
import { RegisteredTool } from './RegisteredTool';
import { ToolRegistryRefreshInput } from './ToolRegistryRefreshInput';
import { ToolRegistrySnapshot } from './ToolRegistrySnapshot';

export interface ToolRegistry {
  refresh(input: ToolRegistryRefreshInput): Promise<ToolRegistrySnapshot>;
  snapshot(): ToolRegistrySnapshot;
  getTool(toolName: string): RegisteredTool | undefined;
  getProjectTool(toolName: string): ProjectToolDefinition | undefined;
  runProjectTool(
    toolName: string,
    args: Record<string, unknown>,
    workspaceRoot: string
  ): Promise<Record<string, unknown>>;
}
