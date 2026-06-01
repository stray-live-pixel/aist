import { CliCommand } from './CliCommand';
import { CliUsageError } from './CliUsageError';
import { assertNoExtraArgs } from './assertNoExtraArgs';
import { parseChatAskCommand } from './parseChatAskCommand';
import { parseChatClearCommand } from './parseChatClearCommand';
import { parseChatGetCommand } from './parseChatGetCommand';
import { parseChatListCommand } from './parseChatListCommand';
import { parseChatNewCommand } from './parseChatNewCommand';
import { parseChatSetModelCommand } from './parseChatSetModelCommand';

export function parseChatCommand(args: readonly string[]): CliCommand {
  const [subcommand, ...rest] = args;
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    assertNoExtraArgs(rest, subcommand || 'chat');
    return { kind: 'help' };
  }

  if (subcommand === 'new') {
    return parseChatNewCommand(rest);
  }

  if (subcommand === 'list') {
    return parseChatListCommand(rest);
  }

  if (subcommand === 'get') {
    return parseChatGetCommand(rest);
  }

  if (subcommand === 'clear') {
    return parseChatClearCommand(rest);
  }

  if (subcommand === 'set-model') {
    return parseChatSetModelCommand(rest);
  }

  if (subcommand === 'ask') {
    return parseChatAskCommand(rest);
  }

  if (subcommand.startsWith('-')) {
    throw new CliUsageError(`Unknown option for 'chat': ${subcommand}`);
  }

  throw new CliUsageError(`Unknown chat command: ${subcommand}`);
}
