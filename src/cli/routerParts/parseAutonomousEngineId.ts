import { type AutonomousEngineId } from '../../core/processes/autonomous';
import { CliUsageError } from './CliUsageError';

export function parseAutonomousEngineId(command: string, value: string | undefined): AutonomousEngineId {
  if (
    value === 'dry-run' ||
    value === 'openrouter-api' ||
    value === 'codex-api' ||
    value === 'claude-cli' ||
    value === 'codex-cli'
  ) {
    return value;
  }

  throw new CliUsageError(
    `Option --engine for '${command}' must be dry-run, openrouter-api, codex-api, claude-cli, or codex-cli.`
  );
}
