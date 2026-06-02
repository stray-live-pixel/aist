import { type ConfigScope } from '../../core/app/config/config';
import { CliUsageError } from './CliUsageError';

export function parseConfigScope(command: string, value: string | undefined): ConfigScope {
  if (value === 'global' || value === 'workspace') {
    return value;
  }

  throw new CliUsageError(`Option --scope for '${command}' must be global or workspace.`);
}
