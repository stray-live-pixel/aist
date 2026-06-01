import { CliCommand } from './CliCommand';
import { CliUsageError } from './CliUsageError';
import { assertNoExtraArgs } from './assertNoExtraArgs';
import { parseModelsOptions } from './parseModelsOptions';

export function parseModelsCommand(args: readonly string[]): CliCommand {
  const [subcommand, ...rest] = args;
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    assertNoExtraArgs(rest, subcommand || 'models');
    return { kind: 'help' };
  }

  if (subcommand === 'list' || subcommand === 'refresh') {
    const options = parseModelsOptions(subcommand, rest);
    if (options.showHelp) {
      return { kind: 'help' };
    }

    return {
      kind: subcommand === 'list' ? 'modelsList' : 'modelsRefresh',
      provider: options.provider,
      json: options.json
    };
  }

  if (subcommand.startsWith('-')) {
    throw new CliUsageError(`Unknown option for 'models': ${subcommand}`);
  }

  throw new CliUsageError(`Unknown models command: ${subcommand}`);
}
