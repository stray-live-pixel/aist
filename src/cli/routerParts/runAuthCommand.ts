import { CliCommand } from './CliCommand';
import { CliWriter } from './CliWriter';
import { RunCliOptions } from './RunCliOptions';
import { formatCodexAuthStatusOutput } from './formatCodexAuthStatusOutput';
import { formatOpenRouterAuthStatusOutput } from './formatOpenRouterAuthStatusOutput';
import { getCodexAuthStatus } from './getCodexAuthStatus';
import { getOpenRouterAuthStatus } from './getOpenRouterAuthStatus';
import { setOpenRouterKey } from './setOpenRouterKey';

export async function runAuthCommand(
  command: Extract<CliCommand, { kind: `auth${string}` }>,
  options: RunCliOptions,
  stdout: CliWriter,
  stderr: CliWriter
): Promise<number> {
  if (command.kind === 'authOpenRouterSetKey') {
    const result = await setOpenRouterKey(command, options, stderr);
    stdout(formatOpenRouterAuthStatusOutput(result, command.json));
    return 0;
  }

  if (command.kind === 'authOpenRouterStatus') {
    const result = await getOpenRouterAuthStatus(options);
    stdout(formatOpenRouterAuthStatusOutput(result, command.json));
    return 0;
  }

  const result = await getCodexAuthStatus(options);
  stdout(formatCodexAuthStatusOutput(result, command.json));
  return 0;
}
