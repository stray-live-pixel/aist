import { AutonomousExportCommandResult } from './AutonomousExportCommandResult';
import { CliCommand } from './CliCommand';
import { RunCliOptions } from './RunCliOptions';
import { createAutonomousBackend } from './createAutonomousBackend';

export async function exportAutonomousSessionCommandResult(
  command: Extract<CliCommand, { kind: 'autonomousExport' }>,
  options: RunCliOptions
): Promise<AutonomousExportCommandResult> {
  const backend = await createAutonomousBackend(command.workspace, options);
  try {
    const result = await backend.exportSession(command.sessionId, command.format);
    return {
      workspaceRoot: backend.workspaceRoot,
      sessionId: result.sessionId,
      format: result.format,
      content: result.content
    };
  } finally {
    backend.dispose();
  }
}
