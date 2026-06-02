import type { OpenRouterMessage } from '../../../shared/types/types';

/**
 * Что это: считает размер model context payload в байтах.
 * Зачем нужно: telemetry фиксирует, сколько контекста отправлено модели перед run.
 * Какую продуктовую проблему решает: команда видит, когда ответы дорожают или контекст становится слишком большим.
 */
export function getContextBytes({ messages }: { messages: OpenRouterMessage[] }): number {
  return Buffer.byteLength(
    JSON.stringify(
      messages.map((message) => ({
        role: message.role,
        content: message.content,
        reasoning: message.reasoning,
        tool_calls: message.tool_calls,
        tool_call_id: message.tool_call_id
      }))
    ),
    'utf8'
  );
}
