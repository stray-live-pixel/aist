import type { ChatContextEstimate, ChatMessageUsageEstimate, ChatUsageEstimate } from '../../chats/types';
import type { OpenRouterMessage, OpenRouterModelOption, OpenRouterModelPricing } from '../../openrouter/types';

/**
 * Оценивает заполненность контекста для отображения в webview.
 *
 * Используется при отправке state: UI получает текущие токены, максимум модели
 * и примерную стоимость входного контекста. Это приблизительная оценка по длине
 * текста, потому что точный tokenizer зависит от провайдера и модели.
 */
export function getChatContextEstimate(
  history: OpenRouterMessage[],
  systemPrompt: string,
  model: OpenRouterModelOption | undefined
): ChatContextEstimate {
  const tokens = estimateMessagesTokens([{ role: 'system', content: systemPrompt }, ...history]);
  const maxTokens = model?.contextLength;
  const percent = maxTokens ? Math.min(100, Math.round((tokens / maxTokens) * 100)) : undefined;
  const inputCostUsd = getCostUsd(tokens, 0, model?.pricing);

  return {
    tokens,
    maxTokens,
    percent,
    inputCostUsd
  };
}

/**
 * Собирает usage одного вызова модели.
 *
 * Agent loop вызывает функцию после каждого ответа модели и затем накапливает
 * результат в usage чата. Стоимость остается undefined, если у модели нет
 * pricing: так UI не показывает ложную цену.
 */
export function getCallUsageEstimate(
  promptTokens: number,
  completionTokens: number,
  pricing: OpenRouterModelPricing | undefined
): ChatUsageEstimate {
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    costUsd: getCostUsd(promptTokens, completionTokens, pricing)
  };
}

export function getMessageUsageEstimate(value: unknown): ChatMessageUsageEstimate {
  return {
    tokens: estimateValueTokens(value)
  };
}

export function createEmptyUsage(): ChatUsageEstimate {
  return {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0
  };
}

export function mergeUsage(target: ChatUsageEstimate, usage: ChatUsageEstimate): void {
  target.promptTokens += usage.promptTokens;
  target.completionTokens += usage.completionTokens;
  target.totalTokens += usage.totalTokens;
  target.costUsd =
    target.costUsd === undefined && usage.costUsd === undefined
      ? undefined
      : (target.costUsd || 0) + (usage.costUsd || 0);
}

export function estimateMessagesTokens(messages: OpenRouterMessage[]): number {
  return messages.reduce((sum, message) => sum + estimateMessageTokens(message), 0);
}

export function estimateMessageTokens(message: OpenRouterMessage): number {
  return estimateValueTokens({
    role: message.role,
    content: message.content,
    reasoning: message.reasoning,
    tool_calls: message.tool_calls,
    tool_call_id: message.tool_call_id
  });
}

function estimateValueTokens(value: unknown): number {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  return Math.max(1, Math.ceil(text.length / 4));
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
