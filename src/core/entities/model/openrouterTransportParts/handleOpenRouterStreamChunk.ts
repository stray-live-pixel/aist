import { type ModelStreamCallbacks, type ToolCall } from '../../../shared/types/types';
import { OpenRouterStreamChunk } from './OpenRouterStreamChunk';
import { OpenRouterUsage } from './OpenRouterUsage';
import { getReasoningDelta } from './getReasoningDelta';
import { mergeToolCallDelta } from './mergeToolCallDelta';

export function handleOpenRouterStreamChunk(
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
