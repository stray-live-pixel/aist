import { type OpenRouterTool } from '../../../shared/types/types';
import { type ProjectToolDefinition, type ProjectToolDiagnostic } from '../../project-tools/projectTools';

export type ToolRegistrySnapshot = {
  tools: OpenRouterTool[];
  projectTools: ProjectToolDefinition[];
  diagnostics: ProjectToolDiagnostic[];
  digest: string;
  version: string;
};
