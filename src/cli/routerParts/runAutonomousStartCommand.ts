import { type AutonomousBackendEvent } from '../../core/processes/autonomous';
import { CliCommand } from './CliCommand';
import { CliWriter } from './CliWriter';
import { RunCliOptions } from './RunCliOptions';
import { createAutonomousBackend } from './createAutonomousBackend';
import { toAutonomousCompletedEvent } from './toAutonomousCompletedEvent';

export async function runAutonomousStartCommand(
  command: Extract<CliCommand, { kind: 'autonomousFlowStart' | 'autonomousRunStart' }>,
  options: RunCliOptions,
  stdout: CliWriter
): Promise<number> {
  const backend = await createAutonomousBackend(command.workspace, options);
  const unsubscribe = backend.onEvent((event: AutonomousBackendEvent) => {
    stdout(`${JSON.stringify(event)}\n`);
  });

  try {
    const result =
      command.kind === 'autonomousFlowStart'
        ? await backend.startFlow(command.flowId, command.launch)
        : await backend.startRun(command.runId, command.launch);
    stdout(`${JSON.stringify({ type: 'autonomous.accepted', ...result })}\n`);
    const session = await backend.waitForSession(result.sessionId);
    stdout(`${JSON.stringify(toAutonomousCompletedEvent(session))}\n`);
    return session.meta.status === 'finished' ? 0 : 1;
  } finally {
    unsubscribe();
    backend.dispose();
  }
}
