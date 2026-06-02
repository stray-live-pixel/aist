import { randomUUID } from 'node:crypto';

import { type OpenRouterMessage, type ToolCall } from '../../../shared/types/types';
import { CodexResponse } from './CodexResponse';
import { withCodexUsage } from './withCodexUsage';

export function parseCodexResponse(data: CodexResponse): OpenRouterMessage {
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
