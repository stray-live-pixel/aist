import { FileBackedConfigStore } from '../../core/app/config/config';
import { CLI_NAME } from './CLI_NAME';
import { CliCommand } from './CliCommand';
import { CliUsageError } from './CliUsageError';
import { ConfigSetResult } from './ConfigSetResult';
import { RunCliOptions } from './RunCliOptions';
import { containsSecretLikePath } from './containsSecretLikePath';
import { redactConfigValue } from './redactConfigValue';
import { resolveCliPaths } from './resolveCliPaths';
import { silentLogger } from './silentLogger';

export async function setConfigCommandResult(
  command: Extract<CliCommand, { kind: 'configSet' }>,
  options: RunCliOptions
): Promise<ConfigSetResult> {
  if (containsSecretLikePath(command.key, command.value)) {
    throw new CliUsageError(
      `Refusing to write secret-like config key '${command.key}'. Use '${CLI_NAME} auth openrouter set-key' for API keys.`
    );
  }

  const paths = resolveCliPaths({ ...options, workspace: command.workspace });
  const store = new FileBackedConfigStore({
    workspaceRoot: paths.workspaceRoot,
    homeDir: options.homeDir,
    logger: silentLogger
  });
  await store.set(command.key, command.value, { scope: command.scope });

  const redacted = redactConfigValue(command.key, command.value);
  return {
    key: command.key,
    value: redacted.value ?? null,
    scope: command.scope,
    redacted: redacted.redacted
  };
}
