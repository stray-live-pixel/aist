import path from 'node:path';

import { ProjectToolDiagnostic } from './ProjectToolDiagnostic';
import { ProjectToolOutputMode } from './ProjectToolOutputMode';

export function normalizeOutputMode(
  value: unknown,
  definitionPath: string,
  toolId: string,
  diagnostics: ProjectToolDiagnostic[]
): ProjectToolOutputMode {
  if (value === undefined || value === null || value === '') {
    return 'text';
  }
  if (value === 'text' || value === 'json') {
    return value;
  }
  diagnostics.push({
    code: 'projectTool.outputModeInvalid',
    message: 'Project tool output_mode must be "text" or "json".',
    path: definitionPath,
    toolId
  });
  return 'text';
}
