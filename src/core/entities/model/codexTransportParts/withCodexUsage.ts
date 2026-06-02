import { type OpenRouterMessage } from '../../../shared/types/types';
import { CodexUsage } from './CodexUsage';

export function withCodexUsage(message: OpenRouterMessage, usage: CodexUsage | undefined): OpenRouterMessage {
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
