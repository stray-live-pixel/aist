import { type AutonomousExportFormat } from '../../core/processes/autonomous';
import { CliUsageError } from './CliUsageError';

export function parseAutonomousExportFormat(value: string | undefined): AutonomousExportFormat {
  if (value === 'markdown' || value === 'json') {
    return value;
  }

  throw new CliUsageError(`Option --format for 'autonomous export' must be markdown or json.`);
}
