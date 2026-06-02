import { CliCommand } from './CliCommand';
import { CliUsageError } from './CliUsageError';
import { assertNoExtraArgs } from './assertNoExtraArgs';

export function parseOpenRouterSetKeyCommand(args: readonly string[]): CliCommand {
  let fromEnv = false;
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

    if (token === '--from-env') {
      fromEnv = true;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for 'auth openrouter set-key': ${token}`);
    }

    throw new CliUsageError(`Unexpected argument for 'auth openrouter set-key': ${token}`);
  }

  return { kind: 'authOpenRouterSetKey', fromEnv, json };
}
