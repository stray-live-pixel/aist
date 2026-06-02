import { CliUsageError } from './CliUsageError';

export function parseStringOptionToken(
  command: string,
  option: string,
  args: readonly string[],
  index: number,
  current: string | undefined
): { readonly matched: boolean; readonly value?: string; readonly index: number } {
  const token = args[index];

  if (token === option) {
    if (current !== undefined) {
      throw new CliUsageError(`Option ${option} was provided more than once for '${command}'.`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith('-')) {
      throw new CliUsageError(`Option ${option} for '${command}' requires a value.`);
    }
    return { matched: true, value, index: index + 1 };
  }

  if (token.startsWith(`${option}=`)) {
    if (current !== undefined) {
      throw new CliUsageError(`Option ${option} was provided more than once for '${command}'.`);
    }
    const value = token.slice(option.length + 1);
    if (value.trim() === '') {
      throw new CliUsageError(`Option ${option} for '${command}' requires a value.`);
    }
    return { matched: true, value, index };
  }

  return { matched: false, value: current, index };
}
