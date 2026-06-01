import { CliUsageError } from './CliUsageError';

export function parseSocketOptionToken(
  command: string,
  args: readonly string[],
  index: number,
  current: string | undefined
): { readonly matched: boolean; readonly socket?: string; readonly index: number } {
  const token = args[index];

  if (token === '--socket') {
    if (current !== undefined) {
      throw new CliUsageError(`Option --socket was provided more than once for '${command}'.`);
    }

    const value = args[index + 1];
    if (!value || value.startsWith('-')) {
      throw new CliUsageError(`Option --socket for '${command}' requires a path.`);
    }

    return { matched: true, socket: value, index: index + 1 };
  }

  if (token.startsWith('--socket=')) {
    if (current !== undefined) {
      throw new CliUsageError(`Option --socket was provided more than once for '${command}'.`);
    }

    const value = token.slice('--socket='.length);
    if (value.trim() === '') {
      throw new CliUsageError(`Option --socket for '${command}' requires a path.`);
    }

    return { matched: true, socket: value, index };
  }

  return { matched: false, socket: current, index };
}
