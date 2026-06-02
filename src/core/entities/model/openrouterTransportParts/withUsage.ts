import { type OpenRouterMessage } from '../../../shared/types/types';
import { OpenRouterUsage } from './OpenRouterUsage';

export function withUsage(message: OpenRouterMessage, usage: OpenRouterUsage | undefined): OpenRouterMessage {
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
