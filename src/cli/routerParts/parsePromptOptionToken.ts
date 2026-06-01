import { CliUsageError } from './CliUsageError';

export function parsePromptOptionToken(
  command: string,
  args: readonly string[],
  index: number,
  current: string | undefined
): { readonly matched: boolean; readonly prompt?: string; readonly index: number } {
  const token = args[index];

  if (token === '--prompt') {
    if (current !== undefined) {
      throw new CliUsageError(`Option --prompt was provided more than once for '${command}'.`);
    }

    const value = args[index + 1];
    if (value === undefined) {
      throw new CliUsageError(`Option --prompt for '${command}' requires text.`);
    }

    return { matched: true, prompt: value, index: index + 1 };
  }

  if (token.startsWith('--prompt=')) {
    if (current !== undefined) {
      throw new CliUsageError(`Option --prompt was provided more than once for '${command}'.`);
    }

    return { matched: true, prompt: token.slice('--prompt='.length), index };
  }

  return { matched: false, prompt: current, index };
}
