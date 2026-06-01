import { type ModelStreamCallbacks, type OpenRouterMessage, type ToolCall } from '../../../shared/types/types';
import { type ModelTransportLogger } from '../modelTransport';
import { OpenRouterUsage } from './OpenRouterUsage';
import { handleOpenRouterStreamChunk } from './handleOpenRouterStreamChunk';
import { logUsageDiagnostics } from './logUsageDiagnostics';
import { withUsage } from './withUsage';

export async function parseOpenRouterStream(
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
