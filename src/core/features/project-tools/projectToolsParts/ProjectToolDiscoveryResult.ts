import { ProjectToolDefinition } from './ProjectToolDefinition';
import { ProjectToolDiagnostic } from './ProjectToolDiagnostic';

export type ProjectToolDiscoveryResult = {
  tools: ProjectToolDefinition[];
  diagnostics: ProjectToolDiagnostic[];
  digest: string;
  version: string;
};
