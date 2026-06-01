import { CliCommand } from './CliCommand';
import { CliWriter } from './CliWriter';
import { RunCliOptions } from './RunCliOptions';
import { formatConfigGetOutput } from './formatConfigGetOutput';
import { formatConfigSetOutput } from './formatConfigSetOutput';
import { getConfigCommandResult } from './getConfigCommandResult';
import { setConfigCommandResult } from './setConfigCommandResult';

export async function runConfigCommand(
  command: Extract<CliCommand, { kind: `config${string}` }>,
  options: RunCliOptions,
  stdout: CliWriter
): Promise<number> {
  if (command.kind === 'configGet') {
    const result = await getConfigCommandResult(command, options);
    stdout(formatConfigGetOutput(result, command.json));
    return 0;
  }

  const result = await setConfigCommandResult(command, options);
  stdout(formatConfigSetOutput(result, command.json));
  return 0;
}
