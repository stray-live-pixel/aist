import { CliCommand } from './CliCommand';
import { CliUsageError } from './CliUsageError';
import { assertNoExtraArgs } from './assertNoExtraArgs';
import { parseAuthStatusCommand } from './parseAuthStatusCommand';
import { parseOpenRouterSetKeyCommand } from './parseOpenRouterSetKeyCommand';

export function parseAuthCommand(args: readonly string[]): CliCommand {
  const [provider, subcommand, ...rest] = args;
  if (!provider || provider === '--help' || provider === '-h') {
    assertNoExtraArgs(args.slice(provider ? 1 : 0), provider || 'auth');
    return { kind: 'help' };
  }

  if (provider === 'openrouter') {
    if (subcommand === 'set-key') {
      return parseOpenRouterSetKeyCommand(rest);
    }

    if (subcommand === 'status') {
      return parseAuthStatusCommand('auth openrouter status', rest, 'authOpenRouterStatus');
    }

    throw new CliUsageError(`Unknown auth openrouter command: ${subcommand || '<missing>'}`);
  }

  if (provider === 'codex') {
    if (subcommand === 'status') {
      return parseAuthStatusCommand('auth codex status', rest, 'authCodexStatus');
    }

    throw new CliUsageError(`Unknown auth codex command: ${subcommand || '<missing>'}`);
  }

  if (provider.startsWith('-')) {
    throw new CliUsageError(`Unknown option for 'auth': ${provider}`);
  }

  throw new CliUsageError(`Unknown auth provider: ${provider}`);
}
