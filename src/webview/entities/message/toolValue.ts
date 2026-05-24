import type { ChatMessage } from '../../shared/types';

/**
 * Что это: безопасные reader-функции для JSON результатов инструментов.
 * Зачем нужно: tool-result приходит как unknown JSON, поэтому UI не должен напрямую доверять полям.
 * Пример: asString(result.path) вернёт строку только если поле реально непустая строка.
 */
export function getToolResult(message: ChatMessage): Record<string, unknown> | undefined {
  const result = message.result;
  const nested = asRecord(result?.result);

  return isOnlyPreview(result, nested) ? undefined : nested || result;
}

export function getToolPreview(message: ChatMessage): Record<string, unknown> | undefined {
  return asRecord(message.result?.preview);
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isOnlyPreview(
  result: Record<string, unknown> | undefined,
  nested: Record<string, unknown> | undefined
): boolean {
  if (!result || nested) return false;
  return Boolean(asRecord(result.preview) && Object.keys(result).length === 1);
}
