import { CliCommandError } from './CliCommandError';
import { CliUsageError } from './CliUsageError';
import { formatJsonOutput } from './formatJsonOutput';
import { hasErrorCode } from './hasErrorCode';
import { isCliKnownError } from './isCliKnownError';

export function formatCliErrorJson(error: unknown, message: string): string {
  return formatJsonOutput({
    error: {
      message,
      ...(error instanceof CliUsageError ? { code: 'cli.usage', exitCode: error.exitCode } : {}),
      ...(error instanceof CliCommandError
        ? { code: error.code, exitCode: error.exitCode, ...(error.details ? { details: error.details } : {}) }
        : {}),
      ...(!isCliKnownError(error) && hasErrorCode(error) ? { code: error.code } : {})
    }
  });
}
