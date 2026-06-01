import path from 'node:path';

import { ProjectToolDiagnostic } from './ProjectToolDiagnostic';

export function toDiagnostic(code: string, error: unknown, pathValue?: string, toolId?: string): ProjectToolDiagnostic {
  return {
    code,
    message: error instanceof Error ? error.message : String(error),
    path: pathValue,
    toolId
  };
}
