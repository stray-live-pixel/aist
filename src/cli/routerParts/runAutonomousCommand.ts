import { CliCommand } from './CliCommand';
import { CliWriter } from './CliWriter';
import { RunCliOptions } from './RunCliOptions';
import { exportAutonomousSessionCommandResult } from './exportAutonomousSessionCommandResult';
import { formatAutonomousListOutput } from './formatAutonomousListOutput';
import { formatAutonomousStopOutput } from './formatAutonomousStopOutput';
import { getAutonomousStateCommandResult } from './getAutonomousStateCommandResult';
import { runAutonomousStartCommand } from './runAutonomousStartCommand';
import { stopAutonomousSessionCommandResult } from './stopAutonomousSessionCommandResult';

export async function runAutonomousCommand(
  command: Extract<CliCommand, { kind: `autonomous${string}` }>,
  options: RunCliOptions,
  stdout: CliWriter
): Promise<number> {
  if (command.kind === 'autonomousList') {
    const result = await getAutonomousStateCommandResult(command, options);
    stdout(formatAutonomousListOutput(result, command.json));
    return 0;
  }

  if (command.kind === 'autonomousFlowStart' || command.kind === 'autonomousRunStart') {
    return runAutonomousStartCommand(command, options, stdout);
  }

  if (command.kind === 'autonomousStop') {
    const result = await stopAutonomousSessionCommandResult(command, options);
    stdout(formatAutonomousStopOutput(result, command.json));
    return 0;
  }

  const result = await exportAutonomousSessionCommandResult(command, options);
  stdout(result.content);
  return 0;
}
