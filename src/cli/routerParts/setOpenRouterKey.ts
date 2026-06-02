import { FileSecretStore, OPENROUTER_API_KEY_SECRET_KEY } from '../../core/app/config/config';
import { AuthStatusResult } from './AuthStatusResult';
import { CliCommand } from './CliCommand';
import { CliWriter } from './CliWriter';
import { OPENROUTER_ENV_KEY } from './OPENROUTER_ENV_KEY';
import { RunCliOptions } from './RunCliOptions';
import { getCliEnv } from './getCliEnv';
import { readOpenRouterKeyFromStdin } from './readOpenRouterKeyFromStdin';
import { silentLogger } from './silentLogger';

export async function setOpenRouterKey(
  command: Extract<CliCommand, { kind: 'authOpenRouterSetKey' }>,
  options: RunCliOptions,
  stderr: CliWriter
): Promise<AuthStatusResult> {
  const env = getCliEnv(options);
  const rawKey = command.fromEnv ? env[OPENROUTER_ENV_KEY] : await readOpenRouterKeyFromStdin(options, stderr);
  const apiKey = rawKey?.trim();

  if (!apiKey) {
    throw new Error(
      command.fromEnv ? `${OPENROUTER_ENV_KEY} is not set.` : `No OpenRouter API key was provided on stdin.`
    );
  }

  // Secrets are global-only so workspace settings can be committed without leaking credentials.
  const secretStore = new FileSecretStore({ homeDir: options.homeDir, logger: silentLogger });
  await secretStore.store(OPENROUTER_API_KEY_SECRET_KEY, apiKey);

  return {
    provider: 'openrouter',
    authenticated: true,
    source: 'global-secret'
  };
}
