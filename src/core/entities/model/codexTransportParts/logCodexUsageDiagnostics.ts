import { type ModelTransportLogger } from '../modelTransport';
import { CodexUsage } from './CodexUsage';

export function logCodexUsageDiagnostics(
  logger: ModelTransportLogger | undefined,
  message: string,
  model: string,
  usage: CodexUsage | undefined,
  stream: boolean
): void {
  logger?.info(message, {
    model,
    stream,
    hasUsage: Boolean(usage),
    promptTokens: usage?.input_tokens ?? usage?.prompt_tokens,
    completionTokens: usage?.output_tokens ?? usage?.completion_tokens,
    totalTokens: usage?.total_tokens,
    usageKeys: usage ? Object.keys(usage) : []
  });
}
