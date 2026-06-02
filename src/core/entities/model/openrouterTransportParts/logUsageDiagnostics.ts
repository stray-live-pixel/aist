import { type ModelTransportLogger } from '../modelTransport';
import { OpenRouterUsage } from './OpenRouterUsage';

export function logUsageDiagnostics(
  logger: ModelTransportLogger | undefined,
  message: string,
  model: string,
  usage: OpenRouterUsage | undefined,
  stream: boolean
): void {
  logger?.info(message, {
    model,
    stream,
    hasUsage: Boolean(usage),
    promptTokens: usage?.prompt_tokens,
    completionTokens: usage?.completion_tokens,
    totalTokens: usage?.total_tokens,
    usageKeys: usage ? Object.keys(usage) : []
  });
}
