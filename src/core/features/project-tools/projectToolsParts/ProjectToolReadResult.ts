import { ProjectToolDefinition } from './ProjectToolDefinition';
import { ProjectToolDiagnostic } from './ProjectToolDiagnostic';

export type ProjectToolReadResult = {
  tool?: ProjectToolDefinition;
  diagnostics: ProjectToolDiagnostic[];
  digestSource: string;
};
