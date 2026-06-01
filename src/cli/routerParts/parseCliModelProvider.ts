import { CliModelProvider } from './CliModelProvider';
import { CliUsageError } from './CliUsageError';

export function parseCliModelProvider(command: string, value: string | undefined): CliModelProvider {
  if (value === 'openrouter' || value === 'codex' || value === 'all') {
    return value;
  }

  throw new CliUsageError(`Option --provider for '${command}' must be openrouter, codex, or all.`);
}
