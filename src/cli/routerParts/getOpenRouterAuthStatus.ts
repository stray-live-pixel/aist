import { FileSecretStore, OPENROUTER_API_KEY_SECRET_KEY } from '../../core/app/config/config';
import { AuthStatusResult } from './AuthStatusResult';
import { OPENROUTER_ENV_KEY } from './OPENROUTER_ENV_KEY';
import { RunCliOptions } from './RunCliOptions';
import { getCliEnv } from './getCliEnv';
import { silentLogger } from './silentLogger';

export async function getOpenRouterAuthStatus(options: RunCliOptions): Promise<AuthStatusResult> {
  const env = getCliEnv(options);
  if (env[OPENROUTER_ENV_KEY]) {
    return {
      provider: 'openrouter',
      authenticated: true,
      source: 'env'
    };
  }

  const secretStore = new FileSecretStore({ homeDir: options.homeDir, logger: silentLogger });
  const secret = await secretStore.get(OPENROUTER_API_KEY_SECRET_KEY);
  return {
    provider: 'openrouter',
    authenticated: Boolean(secret),
    source: secret ? 'global-secret' : 'none'
  };
}
