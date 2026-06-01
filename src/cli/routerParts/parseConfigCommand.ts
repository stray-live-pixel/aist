import { CliCommand } from './CliCommand';
import { CliUsageError } from './CliUsageError';
import { assertNoExtraArgs } from './assertNoExtraArgs';
import { parseConfigGetCommand } from './parseConfigGetCommand';
import { parseConfigSetCommand } from './parseConfigSetCommand';

export function parseConfigCommand(args: readonly string[]): CliCommand {
  const [subcommand, ...rest] = args;
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    assertNoExtraArgs(rest, subcommand || 'config');
    return { kind: 'help' };
  }

  if (subcommand === 'get') {
    return parseConfigGetCommand(rest);
  }

  if (subcommand === 'set') {
    return parseConfigSetCommand(rest);
  }

  if (subcommand.startsWith('-')) {
    throw new CliUsageError(`Unknown option for 'config': ${subcommand}`);
  }

  throw new CliUsageError(`Unknown config command: ${subcommand}`);
}
