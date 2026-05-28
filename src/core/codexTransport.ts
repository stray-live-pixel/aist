import { randomUUID } from 'node:crypto';

import { CODEX_RESPONSES_URL, DEFAULT_CODEX_MODEL, FALLBACK_MODEL_OPTIONS } from './modelDefaults';
import { ModelRequestError } from './modelErrors';
import {
  type FetchLike,
  type ModelCatalogClient,
  type ModelClient,
  type ModelTransportLogger,
  resolveFetch
} from './modelTransport';
import type {
  CodexServiceTier,
  ModelRequestLifecycleCallbacks,
  ModelStreamCallbacks,
  OpenRouterMessage,
  OpenRouterModelOption,
  OpenRouterTool,
  ToolCall
} from './types';

export type CodexAccessToken = {
  accessToken: string;
  accountId?: string;
};

export interface CodexTokenProvider {
  getToken(): Promise<CodexAccessToken>;
}

export type CodexResponsesTransportOptions = {
  tokenProvider: CodexTokenProvider;
  fetch?: FetchLike;
  logger?: ModelTransportLogger;
  endpoint?: string;
  sessionId?: string;
  userAgent?: string;
  defaultModel?: string;
  serviceTier?: CodexServiceTier;
};

type CodexResponse = {
  output_text?: string;
  output?: CodexOutputItem[];
  choices?: Array<{
    message?: OpenRouterMessage;
  }>;
  usage?: CodexUsage;
};

type CodexUsage = {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
};

type CodexStreamEvent = {
  type?: string;
  delta?: string;
  text?: string;
  item?: CodexOutputItem;
  part?: {
    text?: string;
  };
  response?: CodexResponse;
  error?: {
    message?: string;
  };
};

type CodexOutputItem =
  | {
      type?: 'message';
      role?: string;
      content?: Array<{ type?: string; text?: string }>;
    }
  | {
      type?: 'function_call';
      id?: string;
      call_id?: string;
      name?: string;
      arguments?: string;
    }
  | {
      type?: 'reasoning';
      summary?: Array<{ text?: string }>;
      content?: Array<{ text?: string }>;
    };

type CodexInputItem =
  | {
      role: 'user' | 'assistant';
      content: string;
    }
  | {
      type: 'function_call';
      call_id: string;
      name: string;
      arguments: string;
    }
  | {
      type: 'function_call_output';
      call_id: string;
      output: string;
    };

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
    codexServiceTier: CodexServiceTier = this.options.serviceTier || 'auto'
  ): Promise<OpenRouterMessage> {
    const auth = await this.options.tokenProvider.getToken();
    const model = stripCodexPrefix(modelOverride || this.defaultModel);
    const payload = toCodexPayload(messages);
    const response = await this.fetchImpl(this.endpoint, {
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
        instructions: payload.instructions,
        input: payload.input,
        ...(tools?.length ? { tools: tools.map(toCodexTool), tool_choice: 'auto' } : {})
      })
    });
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

function toCodexPayload(messages: OpenRouterMessage[]): { instructions: string; input: CodexInputItem[] } {
  const instructions: string[] = [];
  const input: CodexInputItem[] = [];

  for (const message of messages) {
    if (message.role === 'system') {
      if (message.content) {
        instructions.push(message.content);
      }
      continue;
    }

    if (message.role === 'tool') {
      if (message.tool_call_id) {
        input.push({
          type: 'function_call_output',
          call_id: message.tool_call_id,
          output: message.content || ''
        });
      }
      continue;
    }

    if (message.content) {
      input.push({
        role: message.role,
        content: message.content
      });
    }

    for (const toolCall of message.tool_calls || []) {
      input.push({
        type: 'function_call',
        call_id: toolCall.id,
        name: toolCall.function.name,
        arguments: stringifyToolArguments(toolCall.function.arguments)
      });
    }
  }

  return {
    instructions: instructions.join('\n\n').trim() || 'You are a helpful coding assistant.',
    input
  };
}

function toCodexTool(tool: OpenRouterTool): Record<string, unknown> {
  return {
    type: 'function',
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters
  };
}

function parseCodexResponse(data: CodexResponse): OpenRouterMessage {
  const chatMessage = data.choices?.[0]?.message;
  if (chatMessage) {
    return withCodexUsage(chatMessage, data.usage);
  }

  const textParts: string[] = [];
  const reasoningParts: string[] = [];
  const toolCalls: ToolCall[] = [];

  for (const item of data.output || []) {
    if (item.type === 'message') {
      for (const content of item.content || []) {
        if (content.text) {
          textParts.push(content.text);
        }
      }
    }

    if (item.type === 'reasoning') {
      for (const content of [...(item.summary || []), ...(item.content || [])]) {
        if (content.text) {
          reasoningParts.push(content.text);
        }
      }
    }

    if (item.type === 'function_call' && item.name) {
      const id = item.call_id || item.id || randomUUID();
      toolCalls.push({
        id,
        type: 'function',
        function: {
          name: item.name,
          arguments: item.arguments || '{}'
        }
      });
    }
  }

  const content = textParts.join('\n').trim() || data.output_text || '';
  if (!content && !toolCalls.length) {
    throw new Error('ChatGPT Codex returned an empty response.');
  }

  return withCodexUsage(
    {
      role: 'assistant',
      content,
      ...(reasoningParts.length ? { reasoning: reasoningParts.join('\n') } : {}),
      ...(toolCalls.length ? { tool_calls: toolCalls } : {})
    },
    data.usage
  );
}

function withCodexUsage(message: OpenRouterMessage, usage: CodexUsage | undefined): OpenRouterMessage {
  if (!usage) {
    return message;
  }

  return {
    ...message,
    usage: {
      promptTokens: usage.input_tokens ?? usage.prompt_tokens,
      completionTokens: usage.output_tokens ?? usage.completion_tokens,
      totalTokens: usage.total_tokens
    }
  };
}

function logCodexUsageDiagnostics(
  logger: ModelTransportLogger | undefined,
  message: string,
  model: string,
  usage: CodexUsage | undefined,
  stream: boolean
): void {
  logger?.info(message, {
    model,
    stream,
    hasUsage: Boolean(usage),
    promptTokens: usage?.input_tokens ?? usage?.prompt_tokens,
    completionTokens: usage?.output_tokens ?? usage?.completion_tokens,
    totalTokens: usage?.total_tokens,
    usageKeys: usage ? Object.keys(usage) : []
  });
}

async function parseCodexStream(
  body: ReadableStream<Uint8Array>,
  callbacks: ModelStreamCallbacks | undefined,
  model: string,
  endpoint: string,
  logger: ModelTransportLogger | undefined
): Promise<OpenRouterMessage> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const outputItems: CodexOutputItem[] = [];
  const seenEventTypes = new Set<string>();
  let outputText = '';
  let completedResponse: CodexResponse | undefined;
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
      const result = handleCodexStreamEvent(part, {
        callbacks,
        endpoint,
        model,
        hasOutputText: outputText.length > 0,
        outputItems,
        seenEventTypes
      });
      outputText += result.outputTextDelta;
      completedResponse = result.completedResponse || completedResponse;
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    const result = handleCodexStreamEvent(buffer, {
      callbacks,
      endpoint,
      model,
      hasOutputText: outputText.length > 0,
      outputItems,
      seenEventTypes
    });
    outputText += result.outputTextDelta;
    completedResponse = result.completedResponse || completedResponse;
  }

  callbacks?.onComplete?.();

  if (completedResponse) {
    const enrichedResponse: CodexResponse = {
      ...completedResponse,
      output_text: completedResponse.output_text || outputText,
      output: completedResponse.output?.length ? completedResponse.output : outputItems
    };
    logCodexUsageDiagnostics(logger, 'ChatGPT Codex stream completed', model, enrichedResponse.usage, true);

    try {
      return parseCodexResponse(enrichedResponse);
    } catch {
      if (outputText || outputItems.length) {
        return parseCodexResponse({
          output_text: outputText,
          output: outputItems
        });
      }
      throw new Error(
        `ChatGPT Codex returned an empty response. Stream events: ${[...seenEventTypes].join(', ') || 'none'}`
      );
    }
  }

  logCodexUsageDiagnostics(logger, 'ChatGPT Codex stream completed', model, undefined, true);
  return parseCodexResponse({
    output_text: outputText,
    output: outputItems
  });
}

function handleCodexStreamEvent(
  chunk: string,
  context: {
    callbacks: ModelStreamCallbacks | undefined;
    endpoint: string;
    hasOutputText: boolean;
    model: string;
    outputItems: CodexOutputItem[];
    seenEventTypes: Set<string>;
  }
): { outputTextDelta: string; completedResponse?: CodexResponse } {
  const event = parseSseEvent(chunk);
  if (!event) {
    return { outputTextDelta: '' };
  }
  if (event.type) {
    context.seenEventTypes.add(event.type);
  }

  if (event.type === 'response.failed') {
    throw new ModelRequestError({
      provider: 'codex',
      model: context.model,
      endpoint: context.endpoint,
      method: 'POST',
      message: event.error?.message || 'ChatGPT Codex stream failed.'
    });
  }

  if (event.type === 'response.completed' && event.response) {
    return { outputTextDelta: '', completedResponse: event.response };
  }

  if (event.type === 'response.output_text.delta' && event.delta) {
    context.callbacks?.onContentDelta?.(event.delta);
    return { outputTextDelta: event.delta };
  }

  if (event.type === 'response.output_text.done' && event.text) {
    if (context.hasOutputText) {
      return { outputTextDelta: '' };
    }
    context.callbacks?.onContentDelta?.(event.text);
    return { outputTextDelta: event.text };
  }

  if (event.type === 'response.content_part.done' && event.part?.text) {
    context.callbacks?.onContentDelta?.(event.part.text);
    return { outputTextDelta: event.part.text };
  }

  if (event.type === 'response.output_item.done' && event.item) {
    context.outputItems.push(event.item);
  }

  return { outputTextDelta: '' };
}

function parseSseEvent(chunk: string): CodexStreamEvent | undefined {
  const eventName = chunk
    .split(/\r?\n/)
    .find((line) => line.startsWith('event:'))
    ?.slice('event:'.length)
    .trim();
  const data = chunk
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).trimStart())
    .join('\n')
    .trim();

  if (!data || data === '[DONE]') {
    return undefined;
  }

  try {
    const event = JSON.parse(data) as CodexStreamEvent;
    return event.type || !eventName ? event : { ...event, type: eventName };
  } catch {
    return undefined;
  }
}

function stringifyToolArguments(value: string | Record<string, unknown> | undefined): string {
  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value || {});
}

function stripCodexPrefix(modelId: string): string {
  return modelId.startsWith('codex:') ? modelId.slice('codex:'.length) : modelId;
}
