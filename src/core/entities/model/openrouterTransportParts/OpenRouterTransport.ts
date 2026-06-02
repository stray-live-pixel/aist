import {
  type ModelRequestLifecycleCallbacks,
  type ModelStreamCallbacks,
  type OpenRouterMessage,
  type OpenRouterModelOption,
  type OpenRouterTool
} from '../../../shared/types/types';
import { DEFAULT_MODEL, OPENROUTER_MODELS_URL, OPENROUTER_URL } from '../modelDefaults';
import { ModelRequestError } from '../modelErrors';
import {
  type FetchLike,
  type ModelCatalogClient,
  type ModelClient,
  type ModelRequestOptions,
  resolveFetch
} from '../modelTransport';
import { resolveProviderRequestUrl } from '../resolveProviderRequestUrl';
import { OpenRouterModelsResponse } from './OpenRouterModelsResponse';
import { OpenRouterResponse } from './OpenRouterResponse';
import { OpenRouterTransportOptions } from './OpenRouterTransportOptions';
import { logUsageDiagnostics } from './logUsageDiagnostics';
import { parseOpenRouterStream } from './parseOpenRouterStream';
import { parsePricing } from './parsePricing';
import { withUsage } from './withUsage';

export class OpenRouterTransport implements ModelClient, ModelCatalogClient {
  private readonly fetchImpl: FetchLike;
  private readonly chatEndpoint: string;
  private readonly modelsEndpoint: string;
  private readonly temperature: number;

  constructor(private readonly options: OpenRouterTransportOptions) {
    this.fetchImpl = resolveFetch(options.fetch);
    this.chatEndpoint = options.chatEndpoint || OPENROUTER_URL;
    this.modelsEndpoint = options.modelsEndpoint || OPENROUTER_MODELS_URL;
    this.temperature = options.temperature ?? 0.2;
  }

  async chat(
    messages: OpenRouterMessage[],
    tools?: OpenRouterTool[],
    modelOverride?: string,
    signal?: AbortSignal,
    stream?: ModelStreamCallbacks,
    lifecycle?: ModelRequestLifecycleCallbacks,
    requestOptions?: ModelRequestOptions
  ): Promise<OpenRouterMessage> {
    const model = modelOverride || this.options.model || DEFAULT_MODEL;
    const reasoningEffort = requestOptions?.reasoningEffort || this.options.reasoningEffort;

    if (!this.options.apiKey) {
      throw new Error(this.options.missingApiKeyMessage || 'Set an OpenRouter API key before sending model requests.');
    }

    const response = await this.fetchImpl(
      resolveProviderRequestUrl({ endpoint: this.chatEndpoint, proxyHost: this.options.proxyHost }),
      {
        method: 'POST',
        signal,
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          'Content-Type': 'application/json',
          ...(this.options.siteUrl ? { 'HTTP-Referer': this.options.siteUrl } : {}),
          ...(this.options.siteName ? { 'X-Title': this.options.siteName } : {})
        },
        body: JSON.stringify({
          model,
          messages,
          ...(tools ? { tools, tool_choice: 'auto' } : {}),
          ...(reasoningEffort === 'auto' || !reasoningEffort ? {} : { reasoning: { effort: reasoningEffort } }),
          ...(stream ? { stream: true, stream_options: { include_usage: true } } : {}),
          temperature: this.temperature
        })
      }
    );
    lifecycle?.onResponseHeaders?.({ status: response.status, statusText: response.statusText });

    if (!response.ok) {
      const text = await response.text();
      throw new ModelRequestError({
        provider: 'openrouter',
        model,
        endpoint: this.chatEndpoint,
        method: 'POST',
        status: response.status,
        statusText: response.statusText,
        responseBody: text
      });
    }

    if (stream && response.body) {
      return parseOpenRouterStream(response.body, stream, model, this.options.logger);
    }

    const data = (await response.json()) as OpenRouterResponse;
    logUsageDiagnostics(this.options.logger, 'OpenRouter response received', model, data.usage, false);
    const answer = data.choices?.[0]?.message;

    if (!answer) {
      throw new Error('OpenRouter returned an empty response.');
    }

    return withUsage(answer, data.usage);
  }

  async listModels(): Promise<OpenRouterModelOption[]> {
    const modelsEndpoint = `${this.modelsEndpoint}?output_modalities=text`;
    const response = await this.fetchImpl(
      resolveProviderRequestUrl({ endpoint: modelsEndpoint, proxyHost: this.options.proxyHost }),
      {
        method: 'GET',
        headers: {
          ...(this.options.apiKey ? { Authorization: `Bearer ${this.options.apiKey}` } : {})
        }
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new ModelRequestError({
        provider: 'openrouter',
        endpoint: this.modelsEndpoint,
        method: 'GET',
        status: response.status,
        statusText: response.statusText,
        responseBody: text
      });
    }

    const data = (await response.json()) as OpenRouterModelsResponse;
    const models = (data.data || [])
      .filter((model) => model.id)
      .map((model) => ({
        id: model.id!,
        name: model.name || model.id!,
        provider: 'openrouter' as const,
        contextLength: model.context_length,
        pricing: parsePricing(model.pricing),
        supportsTools: Boolean(model.supported_parameters?.includes('tools'))
      }));

    return models.sort((a, b) => a.name.localeCompare(b.name));
  }
}
