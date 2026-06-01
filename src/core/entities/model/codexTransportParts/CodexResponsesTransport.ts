import { randomUUID } from 'node:crypto';

import {
  type ModelRequestLifecycleCallbacks,
  type ModelStreamCallbacks,
  type OpenRouterMessage,
  type OpenRouterModelOption,
  type OpenRouterTool
} from '../../../shared/types/types';
import { CODEX_RESPONSES_URL, DEFAULT_CODEX_MODEL, FALLBACK_MODEL_OPTIONS } from '../modelDefaults';
import { ModelRequestError } from '../modelErrors';
import {
  type FetchLike,
  type ModelCatalogClient,
  type ModelClient,
  type ModelRequestOptions,
  resolveFetch
} from '../modelTransport';
import { resolveProviderRequestUrl } from '../resolveProviderRequestUrl';
import { CodexResponse } from './CodexResponse';
import { CodexResponsesTransportOptions } from './CodexResponsesTransportOptions';
import { logCodexUsageDiagnostics } from './logCodexUsageDiagnostics';
import { parseCodexResponse } from './parseCodexResponse';
import { parseCodexStream } from './parseCodexStream';
import { stripCodexPrefix } from './stripCodexPrefix';
import { toCodexPayload } from './toCodexPayload';
import { toCodexReasoningEffort } from './toCodexReasoningEffort';
import { toCodexTool } from './toCodexTool';

export class CodexResponsesTransport implements ModelClient, ModelCatalogClient {
  private readonly fetchImpl: FetchLike;
  private readonly endpoint: string;
  private readonly sessionId: string;
  private readonly defaultModel: string;

  constructor(private readonly options: CodexResponsesTransportOptions) {
    this.fetchImpl = resolveFetch(options.fetch);
    this.endpoint = options.endpoint || CODEX_RESPONSES_URL;
    this.sessionId = options.sessionId || randomUUID();
    this.defaultModel = options.defaultModel || DEFAULT_CODEX_MODEL;
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
    const codexServiceTier = requestOptions?.codexServiceTier || this.options.serviceTier || 'auto';
    const codexReasoningEffort = toCodexReasoningEffort(requestOptions?.reasoningEffort);
    const auth = await this.options.tokenProvider.getToken();
    const model = stripCodexPrefix(modelOverride || this.defaultModel);
    const payload = toCodexPayload(messages);
    const response = await this.fetchImpl(
      resolveProviderRequestUrl({ endpoint: this.endpoint, proxyHost: this.options.proxyHost }),
      {
        method: 'POST',
        signal,
        headers: {
          authorization: `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json',
          originator: 'opencode',
          ...(this.options.userAgent ? { 'User-Agent': this.options.userAgent } : {}),
          session_id: this.sessionId,
          ...(auth.accountId ? { 'ChatGPT-Account-Id': auth.accountId } : {})
        },
        body: JSON.stringify({
          model,
          store: false,
          stream: true,
          ...(codexServiceTier === 'priority' ? { service_tier: 'priority' } : {}),
          ...(codexReasoningEffort ? { reasoning: { effort: codexReasoningEffort } } : {}),
          instructions: payload.instructions,
          input: payload.input,
          ...(tools?.length ? { tools: tools.map(toCodexTool), tool_choice: 'auto' } : {})
        })
      }
    );
    lifecycle?.onResponseHeaders?.({ status: response.status, statusText: response.statusText });

    if (!response.ok) {
      const text = await response.text();
      throw new ModelRequestError({
        provider: 'codex',
        model,
        endpoint: this.endpoint,
        method: 'POST',
        status: response.status,
        statusText: response.statusText,
        responseBody: text
      });
    }

    if (response.body) {
      return parseCodexStream(response.body, stream, model, this.endpoint, this.options.logger);
    }

    const data = (await response.json()) as CodexResponse;
    logCodexUsageDiagnostics(this.options.logger, 'ChatGPT Codex response received', model, data.usage, false);
    return parseCodexResponse(data);
  }

  listModels(): OpenRouterModelOption[] {
    return FALLBACK_MODEL_OPTIONS.filter((model) => model.provider === 'codex');
  }
}
