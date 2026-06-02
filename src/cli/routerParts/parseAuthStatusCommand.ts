import { CliCommand } from './CliCommand';
import { CliUsageError } from './CliUsageError';
import { assertNoExtraArgs } from './assertNoExtraArgs';

export function parseAuthStatusCommand(
  label: string,
  args: readonly string[],
  kind: 'authOpenRouterStatus' | 'authCodexStatus'
): CliCommand {
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

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for '${label}': ${token}`);
    }

    throw new CliUsageError(`Unexpected argument for '${label}': ${token}`);
  }

  return { kind, json };
}
