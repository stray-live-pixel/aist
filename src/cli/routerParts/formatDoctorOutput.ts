import { globalAistRoot, workspaceAistRoot } from '../../core/entities/storage/storage';
import { DoctorResult } from './DoctorResult';

export function formatDoctorOutput(result: DoctorResult): string {
  const checkLines = result.checks
    .map((check) => `${check.status === 'ok' ? 'OK' : 'FAIL'} ${check.name}: ${check.message}`)
    .join('\n');

  return `AIST doctor
Workspace root: ${result.paths.workspaceRoot}
Workspace AIST root: ${result.paths.workspaceAistRoot}
Global AIST root: ${result.paths.globalAistRoot}

${checkLines}
`;
}
