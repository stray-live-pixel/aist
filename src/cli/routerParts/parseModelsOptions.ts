import { CliModelProvider } from './CliModelProvider';
import { CliUsageError } from './CliUsageError';
import { assertNoExtraArgs } from './assertNoExtraArgs';
import { parseProviderOptionToken } from './parseProviderOptionToken';

export function parseModelsOptions(
  subcommand: 'list' | 'refresh',
  args: readonly string[]
): { readonly provider: CliModelProvider; readonly json: boolean; readonly showHelp: boolean } {
  let provider: CliModelProvider = 'all';
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--help' || token === '-h') {
      assertNoExtraArgs(args.slice(index + 1), token);
      return { provider, json, showHelp: true };
    }

    if (token === '--json') {
      json = true;
      continue;
    }

    const providerResult = parseProviderOptionToken(`models ${subcommand}`, args, index, provider);
    if (providerResult.matched) {
      provider = providerResult.provider;
      index = providerResult.index;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for 'models ${subcommand}': ${token}`);
    }

    throw new CliUsageError(`Unexpected argument for 'models ${subcommand}': ${token}`);
  }

  return { provider, json, showHelp: false };
}
