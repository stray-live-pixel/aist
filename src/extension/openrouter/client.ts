import { type ConfigStore, OPENROUTER_API_KEY_SECRET_KEY, type SecretStore } from '../../core/config';
import { DEFAULT_MODEL } from '../../core/modelDefaults';
import { OpenRouterTransport, type OpenRouterTransportOptions } from '../../core/openrouterTransport';
import type {
  JsonValue,
  ModelRequestLifecycleCallbacks,
  ModelStreamCallbacks,
  OpenRouterMessage,
  OpenRouterModelOption,
  OpenRouterTool,
  ReasoningEffort
} from '../../core/types';
import type { AistLogger } from '../shared/logger';

export { OPENROUTER_API_KEY_SECRET_KEY };
export type { ReasoningEffort } from '../../core/types';

export type OpenRouterClientTransportOptions = Pick<
  OpenRouterTransportOptions,
  'fetch' | 'chatEndpoint' | 'modelsEndpoint' | 'temperature'
>;

export class OpenRouterClient {
  constructor(
    private readonly configStore: ConfigStore,
    private readonly secretStore?: Pick<SecretStore, 'get'>,
    private readonly logger?: AistLogger,
    private readonly env: Record<string, string | undefined> = process.env,
    private readonly transportOptions: OpenRouterClientTransportOptions = {}
  ) {}

  async chat(
    messages: OpenRouterMessage[],
    tools?: OpenRouterTool[],
    modelOverride?: string,
    signal?: AbortSignal,
    stream?: ModelStreamCallbacks,
    lifecycle?: ModelRequestLifecycleCallbacks
  ): Promise<OpenRouterMessage> {
    const transport = new OpenRouterTransport(await this.getTransportOptions(modelOverride));
    return transport.chat(messages, tools, modelOverride, signal, stream, lifecycle);
  }

  async listModels(): Promise<OpenRouterModelOption[]> {
    const transport = new OpenRouterTransport({
      ...this.transportOptions,
      apiKey: await this.getApiKey(),
      logger: this.logger
    });
    return transport.listModels();
  }

  private async getTransportOptions(modelOverride?: string): Promise<OpenRouterTransportOptions> {
    return {
      ...this.transportOptions,
      apiKey: await this.getApiKey(),
      model: modelOverride || (await getConfigString(this.configStore, 'model')) || DEFAULT_MODEL,
      siteUrl: await getConfigString(this.configStore, 'siteUrl', ''),
      siteName: await getConfigString(this.configStore, 'siteName', 'aist'),
      reasoningEffort: normalizeReasoningEffort(await this.configStore.get('reasoningEffort')),
      logger: this.logger,
      missingApiKeyMessage: 'Set openrouterAgent.apiKey in VS Code settings or OPENROUTER_API_KEY in your environment.'
    };
  }

  private async getApiKey(): Promise<string | undefined> {
    const envApiKey = this.env.OPENROUTER_API_KEY;
    if (envApiKey) {
      return envApiKey;
    }

    const secretApiKey = await this.secretStore?.get(OPENROUTER_API_KEY_SECRET_KEY);
    if (secretApiKey) {
      return secretApiKey;
    }

    return getConfigString(this.configStore, 'apiKey');
  }
}

async function getConfigString(store: ConfigStore, key: string, defaultValue = ''): Promise<string> {
  const value: JsonValue | undefined = await store.get(key);
  return typeof value === 'string' ? value : defaultValue;
}

function normalizeReasoningEffort(value: unknown): ReasoningEffort {
  return value === 'low' || value === 'medium' || value === 'high' ? value : 'auto';
}
