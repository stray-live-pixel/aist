import { CodexResponsesTransport } from '../../core/entities/model/codexTransport';
import { type ModelProvider, type OpenRouterModelOption } from '../../core/shared/types/types';
import { CliModelProvider } from './CliModelProvider';
import { ModelsListResult } from './ModelsListResult';
import { RunCliOptions } from './RunCliOptions';
import { dedupeAndSortModels } from './dedupeAndSortModels';
import { fallbackModels } from './fallbackModels';
import { formatError } from './formatError';
import { loadOpenRouterModels } from './loadOpenRouterModels';
import { silentLogger } from './silentLogger';
import { unusedFetch } from './unusedFetch';

export async function getModelsList(
  provider: CliModelProvider,
  options: RunCliOptions,
  refreshed: boolean
): Promise<ModelsListResult> {
  const providers: ModelProvider[] = provider === 'all' ? ['openrouter', 'codex'] : [provider];
  const models: OpenRouterModelOption[] = [];
  const errors: string[] = [];
  let fallbackUsed = false;

  if (providers.includes('openrouter')) {
    const openRouterModels = await loadOpenRouterModels(options).catch((error: unknown) => {
      fallbackUsed = true;
      errors.push(formatError(error));
      return fallbackModels('openrouter');
    });
    if (openRouterModels.fallback) {
      fallbackUsed = true;
    }
    models.push(...openRouterModels.models);
  }

  if (providers.includes('codex')) {
    const transport = new CodexResponsesTransport({
      tokenProvider: { getToken: async () => ({ accessToken: '' }) },
      fetch: options.fetch || unusedFetch,
      logger: silentLogger
    });
    models.push(...transport.listModels());
  }

  return {
    provider,
    refreshed,
    fallbackUsed,
    errors,
    models: dedupeAndSortModels(models)
  };
}
