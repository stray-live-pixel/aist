import { CliCommand } from './CliCommand';
import { CliUsageError } from './CliUsageError';
import { assertNoExtraArgs } from './assertNoExtraArgs';
import { parseModelOptionToken } from './parseModelOptionToken';
import { parseWorkspaceOptionToken } from './parseWorkspaceOptionToken';

export function parseChatNewCommand(args: readonly string[]): CliCommand {
  let workspace: string | undefined;
  let model: string | undefined;
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

    const workspaceResult = parseWorkspaceOptionToken('chat new', args, index, workspace);
    if (workspaceResult.matched) {
      workspace = workspaceResult.workspace;
      index = workspaceResult.index;
      continue;
    }

    const modelResult = parseModelOptionToken('chat new', args, index, model);
    if (modelResult.matched) {
      model = modelResult.model;
      index = modelResult.index;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for 'chat new': ${token}`);
    }

    throw new CliUsageError(`Unexpected argument for 'chat new': ${token}`);
  }

  return { kind: 'chatNew', workspace, model, json };
}
