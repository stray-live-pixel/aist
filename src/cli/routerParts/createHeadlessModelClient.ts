import { FileBackedConfigStore, FileSecretStore } from '../../core/app/config/config';
import { CodexAuthSessionProvider } from '../../core/entities/model/codexAuth';
import { CodexResponsesTransport } from '../../core/entities/model/codexTransport';
import { type ModelClient } from '../../core/entities/model/modelTransport';
import { OpenRouterTransport } from '../../core/entities/model/openrouterTransport';
import { CLI_NAME } from './CLI_NAME';
import { CliCommandError } from './CliCommandError';
import { OPENROUTER_ENV_KEY } from './OPENROUTER_ENV_KEY';
import { RunCliOptions } from './RunCliOptions';
import { getHeadlessCodexServiceTier } from './getHeadlessCodexServiceTier';
import { getHeadlessReasoningEffort } from './getHeadlessReasoningEffort';
import { getOpenRouterApiKey } from './getOpenRouterApiKey';
import { getStringSetting } from './getStringSetting';
import { silentLogger } from './silentLogger';

export async function createHeadlessModelClient(
  model: string,
  configStore: FileBackedConfigStore,
  options: RunCliOptions
): Promise<ModelClient> {
  if (model.startsWith('codex:')) {
    const secretStore = new FileSecretStore({ homeDir: options.homeDir, logger: silentLogger });
    const authProvider = new CodexAuthSessionProvider(secretStore, { fetch: options.fetch, logger: silentLogger });
    if (!(await authProvider.isAuthenticated())) {
      throw new CliCommandError(
        'auth.codex.missing',
        'ChatGPT Codex auth is not configured. Login through the VS Code extension before using codex:* models.',
        { details: { model } }
      );
    }

    return new CodexResponsesTransport({
      tokenProvider: authProvider,
      fetch: options.fetch,
      logger: silentLogger,
      defaultModel: model,
      serviceTier: await getHeadlessCodexServiceTier(configStore)
    });
  }

  const apiKey = await getOpenRouterApiKey(options);
  if (!apiKey) {
    throw new CliCommandError(
      'auth.openrouter.missing',
      `OpenRouter API key is not configured. Run '${CLI_NAME} auth openrouter set-key' or set ${OPENROUTER_ENV_KEY}.`,
      { details: { model } }
    );
  }

  return new OpenRouterTransport({
    apiKey,
    fetch: options.fetch,
    logger: silentLogger,
    siteUrl: await getStringSetting(configStore, ['openrouterAgent.siteUrl', 'siteUrl']),
    siteName: (await getStringSetting(configStore, ['openrouterAgent.siteName', 'siteName'])) || CLI_NAME,
    reasoningEffort: await getHeadlessReasoningEffort(configStore)
  });
}
