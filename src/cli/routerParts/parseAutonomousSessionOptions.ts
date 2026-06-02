import { CliUsageError } from './CliUsageError';
import { assertNoExtraArgs } from './assertNoExtraArgs';
import { parseWorkspaceOptionToken } from './parseWorkspaceOptionToken';

export function parseAutonomousSessionOptions(
  command: string,
  args: readonly string[]
): { readonly sessionId: string; readonly workspace?: string; readonly json: boolean; readonly showHelp: boolean } {
  let sessionId: string | undefined;
  let workspace: string | undefined;
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--help' || token === '-h') {
      assertNoExtraArgs(args.slice(index + 1), token);
      return { sessionId: '', workspace, json, showHelp: true };
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

    if (sessionId !== undefined) {
      throw new CliUsageError(`Unexpected argument for '${command}': ${token}`);
    }
    sessionId = token;
  }

  if (!sessionId) {
    throw new CliUsageError(`'${command}' requires a session id.`);
  }

  return { sessionId, workspace, json, showHelp: false };
}
