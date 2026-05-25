import * as vscode from 'vscode';

import { DEFAULT_MODEL, OPENROUTER_MODELS_URL, OPENROUTER_URL } from '../shared/constants';
import type { AistLogger } from '../shared/logger';
import type {
  ModelStreamCallbacks,
  OpenRouterMessage,
  OpenRouterModelOption,
  OpenRouterModelPricing,
  OpenRouterTool,
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

export type ReasoningEffort = 'auto' | 'low' | 'medium' | 'high';

export class OpenRouterClient {
  constructor(private readonly logger?: AistLogger) {}

  async chat(
    messages: OpenRouterMessage[],
    tools?: OpenRouterTool[],
    modelOverride?: string,
    signal?: AbortSignal,
    stream?: ModelStreamCallbacks
  ): Promise<OpenRouterMessage> {
    const config = vscode.workspace.getConfiguration('openrouterAgent');
    const apiKey = config.get<string>('apiKey') || process.env.OPENROUTER_API_KEY;
    const model = modelOverride || config.get<string>('model') || DEFAULT_MODEL;
    const siteUrl = config.get<string>('siteUrl') || '';
    const siteName = config.get<string>('siteName') || 'aist';
    const reasoningEffort = normalizeReasoningEffort(config.get<string>('reasoningEffort'));

    if (!apiKey) {
      throw new Error('Set openrouterAgent.apiKey in VS Code settings or OPENROUTER_API_KEY in your environment.');
    }

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(siteUrl ? { 'HTTP-Referer': siteUrl } : {}),
        ...(siteName ? { 'X-Title': siteName } : {})
      },
      body: JSON.stringify({
        model,
        messages,
        ...(tools ? { tools, tool_choice: 'auto' } : {}),
        ...(reasoningEffort === 'auto' ? {} : { reasoning: { effort: reasoningEffort } }),
        ...(stream ? { stream: true, stream_options: { include_usage: true } } : {}),
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenRouter request failed: ${response.status} ${response.statusText}\n${text}`);
    }

    if (stream && response.body) {
      return parseOpenRouterStream(response.body, stream, model, this.logger);
    }

    const data = (await response.json()) as OpenRouterResponse;
    logUsageDiagnostics(this.logger, 'OpenRouter response received', model, data.usage, false);
    const answer = data.choices?.[0]?.message;

    if (!answer) {
      throw new Error('OpenRouter returned an empty response.');
    }

    return withUsage(answer, data.usage);
  }

  async listModels(): Promise<OpenRouterModelOption[]> {
    const config = vscode.workspace.getConfiguration('openrouterAgent');
    const apiKey = config.get<string>('apiKey') || process.env.OPENROUTER_API_KEY;
    const response = await fetch(`${OPENROUTER_MODELS_URL}?output_modalities=text`, {
      method: 'GET',
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenRouter models request failed: ${response.status} ${response.statusText}\n${text}`);
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
  logger: AistLogger | undefined
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
  logger: AistLogger | undefined,
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

function normalizeReasoningEffort(value: unknown): ReasoningEffort {
  return value === 'low' || value === 'medium' || value === 'high' ? value : 'auto';
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
