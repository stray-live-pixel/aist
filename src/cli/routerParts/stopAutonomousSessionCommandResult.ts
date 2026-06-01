import { AutonomousStopCommandResult } from './AutonomousStopCommandResult';
import { CliCommand } from './CliCommand';
import { RunCliOptions } from './RunCliOptions';
import { createAutonomousBackend } from './createAutonomousBackend';
import { tryStopAutonomousSessionViaDaemon } from './tryStopAutonomousSessionViaDaemon';

export async function stopAutonomousSessionCommandResult(
  command: Extract<CliCommand, { kind: 'autonomousStop' }>,
  options: RunCliOptions
): Promise<AutonomousStopCommandResult> {
  const backend = await createAutonomousBackend(command.workspace, options);
  try {
    const daemonResult = await tryStopAutonomousSessionViaDaemon(backend.workspaceRoot, command.sessionId);
    if (daemonResult) {
      return {
        workspaceRoot: backend.workspaceRoot,
        sessionId: daemonResult.sessionId,
        stopped: daemonResult.stopped
      };
    }

    const result = backend.stop(command.sessionId);
    return {
      workspaceRoot: backend.workspaceRoot,
      sessionId: result.sessionId,
      stopped: result.stopped
    };
  } finally {
    backend.dispose();
  }
}
