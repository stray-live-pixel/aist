import { type ToolCall } from '../../../shared/types/types';
import { OpenRouterToolCallDelta } from './OpenRouterToolCallDelta';

export function mergeToolCallDelta(toolCalls: Map<number, ToolCall>, delta: OpenRouterToolCallDelta): void {
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
