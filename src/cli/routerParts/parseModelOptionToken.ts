import { CliUsageError } from './CliUsageError';
import { parseChatModel } from './parseChatModel';

export function parseModelOptionToken(
  command: string,
  args: readonly string[],
  index: number,
  current: string | undefined
): { readonly matched: boolean; readonly model?: string; readonly index: number } {
  const token = args[index];

  if (token === '--model') {
    if (current !== undefined) {
      throw new CliUsageError(`Option --model was provided more than once for '${command}'.`);
    }

    const value = args[index + 1];
    return { matched: true, model: parseChatModel(command, value), index: index + 1 };
  }

  if (token.startsWith('--model=')) {
    if (current !== undefined) {
      throw new CliUsageError(`Option --model was provided more than once for '${command}'.`);
    }

    return { matched: true, model: parseChatModel(command, token.slice('--model='.length)), index };
  }

  return { matched: false, model: current, index };
}
