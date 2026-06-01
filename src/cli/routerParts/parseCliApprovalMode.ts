import { CliApprovalMode } from './CliApprovalMode';
import { CliUsageError } from './CliUsageError';

export function parseCliApprovalMode(command: string, value: string | undefined): CliApprovalMode {
  if (value === 'ask' || value === 'auto-readonly' || value === 'auto-all' || value === 'deny') {
    return value;
  }

  throw new CliUsageError(`Option --approval-mode for '${command}' must be ask, auto-readonly, auto-all, or deny.`);
}
