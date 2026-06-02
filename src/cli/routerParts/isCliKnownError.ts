import { CliCommandError } from './CliCommandError';
import { CliUsageError } from './CliUsageError';

export function isCliKnownError(error: unknown): error is CliUsageError | CliCommandError {
  return error instanceof CliUsageError || error instanceof CliCommandError;
}
