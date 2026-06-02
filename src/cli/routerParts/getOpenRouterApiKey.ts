import { FileSecretStore, OPENROUTER_API_KEY_SECRET_KEY } from '../../core/app/config/config';
import { OPENROUTER_ENV_KEY } from './OPENROUTER_ENV_KEY';
import { RunCliOptions } from './RunCliOptions';
import { getCliEnv } from './getCliEnv';
import { silentLogger } from './silentLogger';

export async function getOpenRouterApiKey(options: RunCliOptions): Promise<string | undefined> {
  const env = getCliEnv(options);
  if (env[OPENROUTER_ENV_KEY]) {
    return env[OPENROUTER_ENV_KEY];
  }

  const secretStore = new FileSecretStore({ homeDir: options.homeDir, logger: silentLogger });
  return secretStore.get(OPENROUTER_API_KEY_SECRET_KEY);
}
