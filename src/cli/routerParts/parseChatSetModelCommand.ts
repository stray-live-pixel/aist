import { CliCommand } from './CliCommand';
import { CliUsageError } from './CliUsageError';
import { assertNoExtraArgs } from './assertNoExtraArgs';
import { parseWorkspaceOptionToken } from './parseWorkspaceOptionToken';

export function parseChatSetModelCommand(args: readonly string[]): CliCommand {
  let chatId: string | undefined;
  let model: string | undefined;
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

    const workspaceResult = parseWorkspaceOptionToken('chat set-model', args, index, workspace);
    if (workspaceResult.matched) {
      workspace = workspaceResult.workspace;
      index = workspaceResult.index;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for 'chat set-model': ${token}`);
    }

    if (!chatId) {
      chatId = token;
      continue;
    }

    if (!model) {
      model = token;
      continue;
    }

    throw new CliUsageError(`Unexpected argument for 'chat set-model': ${token}`);
  }

  if (!chatId) {
    throw new CliUsageError(`'chat set-model' requires a chat id.`);
  }

  if (!model) {
    throw new CliUsageError(`'chat set-model' requires a model.`);
  }

  return { kind: 'chatSetModel', chatId, model, workspace, json };
}
