import { CliCommand } from './CliCommand';
import { CliUsageError } from './CliUsageError';
import { assertNoExtraArgs } from './assertNoExtraArgs';
import { parseSocketOptionToken } from './parseSocketOptionToken';
import { parseWorkspaceOptionToken } from './parseWorkspaceOptionToken';

export function parseDaemonCommand(args: readonly string[]): CliCommand {
  let workspace: string | undefined;
  let socket: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--help' || token === '-h') {
      assertNoExtraArgs(args.slice(index + 1), token);
      return { kind: 'help' };
    }

    const workspaceResult = parseWorkspaceOptionToken('daemon', args, index, workspace);
    if (workspaceResult.matched) {
      workspace = workspaceResult.workspace;
      index = workspaceResult.index;
      continue;
    }

    const socketResult = parseSocketOptionToken('daemon', args, index, socket);
    if (socketResult.matched) {
      socket = socketResult.socket;
      index = socketResult.index;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for 'daemon': ${token}`);
    }

    throw new CliUsageError(`Unexpected argument for 'daemon': ${token}`);
  }

  if (!workspace) {
    throw new CliUsageError(`'daemon' requires --workspace <path>.`);
  }

  return { kind: 'daemon', workspace, socket };
}
