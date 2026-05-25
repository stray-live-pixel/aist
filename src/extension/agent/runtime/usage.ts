import type { ChatContextEstimate, ChatUsageEstimate } from '../../chats/types';
import type {
  ModelUsage,
  OpenRouterMessage,
  OpenRouterModelOption,
  OpenRouterModelPricing
} from '../../openrouter/types';

/**
 * Returns only real context data that is known without estimation.
 *
 * We intentionally do not estimate tokens from text length. If a provider does
 * not return usage for a request, token counts stay undefined in the UI.
 */
export function getChatContextEstimate(
  _history: OpenRouterMessage[],
  _systemPrompt: string,
  model: OpenRouterModelOption | undefined
): ChatContextEstimate {
  return {
    maxTokens: model?.contextLength
  };
}

export function getCallUsageFromModelUsage(
  usage: ModelUsage | undefined,
  pricing: OpenRouterModelPricing | undefined
): ChatUsageEstimate | undefined {
  if (!usage) {
    return undefined;
  }

  const promptTokens = usage.promptTokens || 0;
  const completionTokens = usage.completionTokens || 0;
  const totalTokens = usage.totalTokens || promptTokens + completionTokens;

  if (!promptTokens && !completionTokens && !totalTokens) {
    return undefined;
  }

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    costUsd: getCostUsd(promptTokens, completionTokens, pricing)
  };
}

export function createEmptyUsage(): ChatUsageEstimate {
  return {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0
  };
}

export function mergeUsage(target: ChatUsageEstimate, usage: ChatUsageEstimate | undefined): void {
  if (!usage) {
    return;
  }

  target.promptTokens += usage.promptTokens;
  target.completionTokens += usage.completionTokens;
  target.totalTokens += usage.totalTokens;
  target.costUsd =
    target.costUsd === undefined && usage.costUsd === undefined
      ? undefined
      : (target.costUsd || 0) + (usage.costUsd || 0);
}

function getCostUsd(
  promptTokens: number,
  completionTokens: number,
  pricing: OpenRouterModelPricing | undefined
): number | undefined {
  const promptCost = pricing?.prompt === undefined ? undefined : promptTokens * pricing.prompt;
  const completionCost = pricing?.completion === undefined ? undefined : completionTokens * pricing.completion;

  if (promptCost === undefined && completionCost === undefined) {
    return undefined;
  }

  return (promptCost || 0) + (completionCost || 0);
}
