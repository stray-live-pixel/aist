import { CliUsageError } from './CliUsageError';

export function assertNoExtraArgs(args: readonly string[], option: string): void {
  if (args.length > 0) {
    throw new CliUsageError(`Option ${option} does not accept extra arguments.`);
  }
}
