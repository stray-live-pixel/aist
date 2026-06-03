import { type OpenRouterMessage } from '../../../shared/types/types';
import { contentToText } from '../contentToText';
import { CodexInputItem } from './CodexInputItem';
import { stringifyToolArguments } from './stringifyToolArguments';

export function toCodexPayload(messages: OpenRouterMessage[]): { instructions: string; input: CodexInputItem[] } {
  const instructions: string[] = [];
  const input: CodexInputItem[] = [];

  for (const message of messages) {
    const textContent = contentToText({ content: message.content });
    if (message.role === 'system') {
      if (textContent) {
        instructions.push(textContent);
      }
      continue;
    }

    if (message.role === 'tool') {
      if (message.tool_call_id) {
        input.push({
          type: 'function_call_output',
          call_id: message.tool_call_id,
          output: textContent
        });
      }
      continue;
    }

    if (textContent) {
      input.push({
        role: message.role,
        content: textContent
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
