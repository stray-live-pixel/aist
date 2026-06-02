import { OpenRouterTransport } from '../../core/entities/model/openrouterTransport';
import { type OpenRouterModelOption } from '../../core/shared/types/types';
import { RunCliOptions } from './RunCliOptions';
import { fallbackModels } from './fallbackModels';
import { getOpenRouterApiKey } from './getOpenRouterApiKey';
import { getOpenRouterAuthStatus } from './getOpenRouterAuthStatus';
import { silentLogger } from './silentLogger';

export async function loadOpenRouterModels(
  options: RunCliOptions
): Promise<{ readonly fallback: boolean; readonly models: readonly OpenRouterModelOption[] }> {
  const auth = await getOpenRouterAuthStatus(options);
  if (!auth.authenticated) {
    return fallbackModels('openrouter');
  }

  const transport = new OpenRouterTransport({
    apiKey: await getOpenRouterApiKey(options),
    fetch: options.fetch,
    logger: silentLogger
  });
  return {
    fallback: false,
    models: await transport.listModels()
  };
}
