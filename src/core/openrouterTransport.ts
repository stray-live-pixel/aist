import { DEFAULT_MODEL, OPENROUTER_MODELS_URL, OPENROUTER_URL } from './modelDefaults';
import { ModelRequestError } from './modelErrors';
import {
  type FetchLike,
  type ModelCatalogClient,
  type ModelClient,
  type ModelTransportLogger,
  resolveFetch
} from './modelTransport';
import type {
  ModelRequestLifecycleCallbacks,
  ModelStreamCallbacks,
  OpenRouterMessage,
  OpenRouterModelOption,
  OpenRouterModelPricing,
  OpenRouterTool,
  ReasoningEffort,
  ToolCall
} from './types';

type OpenRouterResponse = {
  choices?: Array<{
    message?: OpenRouterMessage;
  }>;
  usage?: OpenRouterUsage;
};

type OpenRouterUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

type OpenRouterStreamChunk = {
  choices?: Array<{
    delta?: OpenRouterStreamDelta;
  }>;
  usage?: OpenRouterUsage;
};

type OpenRouterStreamDelta = {
  content?: string;
  reasoning?: string;
  reasoning_content?: string;
  reasoning_details?: Array<{ text?: string }>;
  tool_calls?: OpenRouterToolCallDelta[];
};

type OpenRouterToolCallDelta = {
  index?: number;
  id?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
};

type OpenRouterModelApiItem = {
  id?: string;
  name?: string;
  context_length?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  supported_parameters?: string[];
};

type OpenRouterModelsResponse = {
  data?: OpenRouterModelApiItem[];
};

export type OpenRouterTransportOptions = {
  apiKey?: string;
  model?: string;
  siteUrl?: string;
  siteName?: string;
  reasoningEffort?: ReasoningEffort;
  fetch?: FetchLike;
  logger?: ModelTransportLogger;
  chatEndpoint?: string;
  modelsEndpoint?: string;
  temperature?: number;
  missingApiKeyMessage?: string;
};

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
    lifecycle?: ModelRequestLifecycleCallbacks
  ): Promise<OpenRouterMessage> {
    const model = modelOverride || this.options.model || DEFAULT_MODEL;

    if (!this.options.apiKey) {
      throw new Error(this.options.missingApiKeyMessage || 'Set an OpenRouter API key before sending model requests.');
    }

    const response = await this.fetchImpl(this.chatEndpoint, {
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
        ...(this.options.reasoningEffort === 'auto' || !this.options.reasoningEffort
          ? {}
          : { reasoning: { effort: this.options.reasoningEffort } }),
        ...(stream ? { stream: true, stream_options: { include_usage: true } } : {}),
        temperature: this.temperature
      })
    });
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
    const response = await this.fetchImpl(`${this.modelsEndpoint}?output_modalities=text`, {
      method: 'GET',
      headers: {
        ...(this.options.apiKey ? { Authorization: `Bearer ${this.options.apiKey}` } : {})
      }
    });

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

async function parseOpenRouterStream(
  body: ReadableStream<Uint8Array>,
  callbacks: ModelStreamCallbacks,
  model: string,
  logger: ModelTransportLogger | undefined
): Promise<OpenRouterMessage> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const contentParts: string[] = [];
  const reasoningParts: string[] = [];
  const toolCalls = new Map<number, ToolCall>();
  let usage: OpenRouterUsage | undefined;
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() || '';

    for (const part of parts) {
      usage = handleOpenRouterStreamChunk(part, contentParts, reasoningParts, toolCalls, callbacks) || usage;
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    usage = handleOpenRouterStreamChunk(buffer, contentParts, reasoningParts, toolCalls, callbacks) || usage;
  }

  const content = contentParts.join('');
  const reasoning = reasoningParts.join('');
  const normalizedToolCalls = [...toolCalls.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, toolCall]) => toolCall)
    .filter((toolCall) => toolCall.id && toolCall.function.name);

  if (!content && !reasoning && !normalizedToolCalls.length) {
    throw new Error('OpenRouter returned an empty streamed response.');
  }

  callbacks.onComplete?.();
  logUsageDiagnostics(logger, 'OpenRouter stream completed', model, usage, true);

  return withUsage(
    {
      role: 'assistant',
      content,
      ...(reasoning ? { reasoning } : {}),
      ...(normalizedToolCalls.length ? { tool_calls: normalizedToolCalls } : {})
    },
    usage
  );
}

function handleOpenRouterStreamChunk(
  chunk: string,
  contentParts: string[],
  reasoningParts: string[],
  toolCalls: Map<number, ToolCall>,
  callbacks: ModelStreamCallbacks
): OpenRouterUsage | undefined {
  let usage: OpenRouterUsage | undefined;
  for (const line of chunk.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) {
      continue;
    }

    const data = trimmed.slice('data:'.length).trim();
    if (!data || data === '[DONE]') {
      continue;
    }

    let parsed: OpenRouterStreamChunk;
    try {
      parsed = JSON.parse(data) as OpenRouterStreamChunk;
    } catch {
      continue;
    }

    usage = parsed.usage || usage;

    const delta = parsed.choices?.[0]?.delta;
    if (!delta) {
      continue;
    }

    const reasoningDelta = getReasoningDelta(delta);
    if (reasoningDelta) {
      reasoningParts.push(reasoningDelta);
      callbacks.onReasoningDelta?.(reasoningDelta);
    }

    if (delta.content) {
      contentParts.push(delta.content);
      callbacks.onContentDelta?.(delta.content);
    }

    for (const toolDelta of delta.tool_calls || []) {
      mergeToolCallDelta(toolCalls, toolDelta);
    }
  }

  return usage;
}

function withUsage(message: OpenRouterMessage, usage: OpenRouterUsage | undefined): OpenRouterMessage {
  if (!usage) {
    return message;
  }

  return {
    ...message,
    usage: {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens
    }
  };
}

function logUsageDiagnostics(
  logger: ModelTransportLogger | undefined,
  message: string,
  model: string,
  usage: OpenRouterUsage | undefined,
  stream: boolean
): void {
  logger?.info(message, {
    model,
    stream,
    hasUsage: Boolean(usage),
    promptTokens: usage?.prompt_tokens,
    completionTokens: usage?.completion_tokens,
    totalTokens: usage?.total_tokens,
    usageKeys: usage ? Object.keys(usage) : []
  });
}

function getReasoningDelta(delta: OpenRouterStreamDelta): string {
  return (
    delta.reasoning || delta.reasoning_content || delta.reasoning_details?.map((item) => item.text || '').join('') || ''
  );
}

function mergeToolCallDelta(toolCalls: Map<number, ToolCall>, delta: OpenRouterToolCallDelta): void {
  const index = delta.index ?? toolCalls.size;
  const current =
    toolCalls.get(index) ||
    ({
      id: '',
      type: 'function',
      function: { name: '', arguments: '' }
    } satisfies ToolCall);

  current.id = delta.id || current.id;
  current.type = 'function';
  current.function.name = delta.function?.name || current.function.name;
  current.function.arguments = `${current.function.arguments || ''}${delta.function?.arguments || ''}`;
  toolCalls.set(index, current);
}

function parsePricing(pricing: OpenRouterModelApiItem['pricing']): OpenRouterModelPricing | undefined {
  const prompt = parsePrice(pricing?.prompt);
  const completion = parsePrice(pricing?.completion);

  if (prompt === undefined && completion === undefined) {
    return undefined;
  }

  return { prompt, completion };
}

function parsePrice(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
