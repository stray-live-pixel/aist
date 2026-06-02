import { CliUsageError } from './CliUsageError';

export function parseChatModel(command: string, value: string | undefined): string {
  if (value && value.trim() && !value.startsWith('-')) {
    return value;
  }

  throw new CliUsageError(`Option --model for '${command}' requires a model.`);
}
