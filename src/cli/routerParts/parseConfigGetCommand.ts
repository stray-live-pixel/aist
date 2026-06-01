import { CliCommand } from './CliCommand';
import { CliUsageError } from './CliUsageError';
import { assertNoExtraArgs } from './assertNoExtraArgs';
import { parseWorkspaceOptionToken } from './parseWorkspaceOptionToken';

export function parseConfigGetCommand(args: readonly string[]): CliCommand {
  let key: string | undefined;
  let workspace: string | undefined;
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--help' || token === '-h') {
      assertNoExtraArgs(args.slice(index + 1), token);
      return { kind: 'help' };
    }

    if (token === '--json') {
      json = true;
      continue;
    }

    const workspaceResult = parseWorkspaceOptionToken('config get', args, index, workspace);
    if (workspaceResult.matched) {
      workspace = workspaceResult.workspace;
      index = workspaceResult.index;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for 'config get': ${token}`);
    }

    if (key !== undefined) {
      throw new CliUsageError(`Unexpected argument for 'config get': ${token}`);
    }

    key = token;
  }

  return { kind: 'configGet', key, workspace, json };
}
