import { CliUsageError } from './CliUsageError';
import { assertNoExtraArgs } from './assertNoExtraArgs';
import { parseWorkspaceOptionToken } from './parseWorkspaceOptionToken';

export function parseChatWorkspaceJsonOptions(
  command: string,
  args: readonly string[]
): { readonly workspace?: string; readonly json: boolean; readonly showHelp: boolean } {
  let workspace: string | undefined;
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--help' || token === '-h') {
      assertNoExtraArgs(args.slice(index + 1), token);
      return { workspace, json, showHelp: true };
    }

    if (token === '--json') {
      json = true;
      continue;
    }

    const workspaceResult = parseWorkspaceOptionToken(command, args, index, workspace);
    if (workspaceResult.matched) {
      workspace = workspaceResult.workspace;
      index = workspaceResult.index;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for '${command}': ${token}`);
    }

    throw new CliUsageError(`Unexpected argument for '${command}': ${token}`);
  }

  return { workspace, json, showHelp: false };
}
