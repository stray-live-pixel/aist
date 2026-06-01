import { type AutonomousDefinitionDiagnostic } from '../types';

export function toDiagnostic(
  code: AutonomousDefinitionDiagnostic['code'],
  error: unknown,
  sourcePath: string
): AutonomousDefinitionDiagnostic {
  return { code, message: error instanceof Error ? error.message : String(error), path: sourcePath };
}
