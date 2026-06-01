import { type ConfigScope } from '../../core/app/config/config';
import { CliUsageError } from './CliUsageError';
import { parseConfigScope } from './parseConfigScope';

export function parseScopeOptionToken(
  command: string,
  args: readonly string[],
  index: number,
  current: ConfigScope | undefined
): { readonly matched: boolean; readonly scope?: ConfigScope; readonly index: number } {
  const token = args[index];

  if (token === '--scope') {
    if (current !== undefined) {
      throw new CliUsageError(`Option --scope was provided more than once for '${command}'.`);
    }

    const value = args[index + 1];
    return { matched: true, scope: parseConfigScope(command, value), index: index + 1 };
  }

  if (token.startsWith('--scope=')) {
    if (current !== undefined) {
      throw new CliUsageError(`Option --scope was provided more than once for '${command}'.`);
    }

    return { matched: true, scope: parseConfigScope(command, token.slice('--scope='.length)), index };
  }

  return { matched: false, scope: current, index };
}
