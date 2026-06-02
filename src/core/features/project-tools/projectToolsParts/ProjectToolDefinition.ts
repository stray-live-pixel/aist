import { type ToolPermissionMode } from '../../../shared/types/types';
import { ProjectToolOutputMode } from './ProjectToolOutputMode';

export type ProjectToolDefinition = {
  source: 'project';
  id: string;
  label: string;
  description: string;
  permission: ToolPermissionMode;
  script: string;
  scriptPath: string;
  definitionPath: string;
  inputSchema: Record<string, unknown>;
  outputMode: ProjectToolOutputMode;
  digest: string;
  version: string;
  enabled: boolean;
};
