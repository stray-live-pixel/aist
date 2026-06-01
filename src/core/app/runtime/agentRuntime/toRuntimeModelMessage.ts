import type { OpenRouterMessage, RuntimeModelMessage } from '../../../shared/types/types';
import { toJsonObject } from './toJsonValue';

/**
 * Что это: нормализует model message для runtime-события model.response.
 * Зачем нужно: tool_call arguments иногда приходят объектом и должны пройти JSON-RPC безопасно.
 * Какую продуктовую проблему решает: consumer событий видит предсказуемый payload независимо от provider модели.
 */
export function toRuntimeModelMessage({ message }: { message: OpenRouterMessage }): RuntimeModelMessage {
  return {
    ...message,
    tool_calls: message.tool_calls?.map((toolCall) => ({
      ...toolCall,
      function: {
        ...toolCall.function,
        arguments:
          typeof toolCall.function.arguments === 'object'
            ? toJsonObject(toolCall.function.arguments as Record<string, unknown>)
            : toolCall.function.arguments
      }
    }))
  };
}
