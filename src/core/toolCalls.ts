import type { RepeatedToolCall, ToolCall } from './types';

/**
 * Safely parses tool-call arguments returned by the model.
 *
 * The model may return either an object or a JSON string. Invalid formats become
 * an empty object so the failure stays local to that tool call.
 */
export function parseToolArguments(rawArgs: unknown): Record<string, unknown> {
  if (!rawArgs) {
    return {};
  }

  if (typeof rawArgs === 'object' && !Array.isArray(rawArgs)) {
    return rawArgs as Record<string, unknown>;
  }

  try {
    const parsed = JSON.parse(String(rawArgs));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function getToolReason(args: Record<string, unknown>): string {
  const reason = args.reason;
  return typeof reason === 'string' && reason.trim() ? reason.trim() : 'No reason provided by the model.';
}

/**
 * Detects a repeated semantic tool call within one agent loop.
 *
 * The reason field is excluded because wording can change while the underlying
 * action and result remain the same.
 */
export function findRepeatedToolCall(toolCalls: ToolCall[], counts: Map<string, number>): RepeatedToolCall | undefined {
  for (const toolCall of toolCalls) {
    const args = parseToolArguments(toolCall.function.arguments);
    const signature = getToolCallSignature(toolCall.function.name, args);
    const count = (counts.get(signature) || 0) + 1;
    counts.set(signature, count);

    if (count > 2) {
      return {
        signature,
        count,
        toolName: toolCall.function.name,
        args
      };
    }
  }

  return undefined;
}

export function getRepeatedToolCallAnswer(toolCall: RepeatedToolCall): string {
  return [
    `Stopped because the model repeated the same ${toolCall.toolName} tool call ${toolCall.count} times in one request.`,
    'That tool result is already available in context, so repeating it would likely continue as a loop.',
    'Please clarify the task or ask the agent to continue from the existing result.'
  ].join('\n');
}

export function redactLargeArgs(args: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    result[key] = typeof value === 'string' && value.length > 600 ? `${value.slice(0, 600)}... <truncated>` : value;
  }
  return result;
}

function getToolCallSignature(toolName: string, args: Record<string, unknown>): string {
  const { reason: _reason, ...semanticArgs } = args;
  return `${toolName}:${stableStringify(semanticArgs)}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}
