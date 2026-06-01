import path from 'node:path';

export type ProjectToolDiagnostic = {
  code: string;
  message: string;
  path?: string;
  toolId?: string;
};
