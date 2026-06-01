import { AutonomousStateCommandResult } from './AutonomousStateCommandResult';
import { CliCommand } from './CliCommand';
import { RunCliOptions } from './RunCliOptions';
import { createAutonomousBackend } from './createAutonomousBackend';

export async function getAutonomousStateCommandResult(
  command: Extract<CliCommand, { kind: 'autonomousList' }>,
  options: RunCliOptions
): Promise<AutonomousStateCommandResult> {
  const backend = await createAutonomousBackend(command.workspace, options);
  try {
    return {
      workspaceRoot: backend.workspaceRoot,
      state: await backend.getState()
    };
  } finally {
    backend.dispose();
  }
}
