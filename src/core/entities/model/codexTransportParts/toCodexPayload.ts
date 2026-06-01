import { type OpenRouterMessage } from '../../../shared/types/types';
import { CodexInputItem } from './CodexInputItem';
import { stringifyToolArguments } from './stringifyToolArguments';

export function toCodexPayload(messages: OpenRouterMessage[]): { instructions: string; input: CodexInputItem[] } {
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
