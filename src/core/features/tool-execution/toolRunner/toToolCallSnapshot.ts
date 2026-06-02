import type { RuntimeToolCallSnapshot, ToolCall } from '../../../shared/types/types';
import { toJsonObject } from './jsonConversion';

/**
 * Что это: собирает snapshot tool-call для run events и approval history.
 * Зачем нужно: после выполнения нужно знать имя, args, reason и nextStep исходного вызова.
 * Какую продуктовую проблему решает: timeline run остаётся понятным после reconnect/replay.
 */
export function toToolCallSnapshot({
  toolCall,
  args,
  reason,
  nextStep
}: {
  toolCall: ToolCall;
  args: Record<string, unknown>;
  reason: string;
  nextStep?: string;
}): RuntimeToolCallSnapshot {
  return { id: toolCall.id, name: toolCall.function.name, args: toJsonObject({ value: args }), reason, nextStep };
}
