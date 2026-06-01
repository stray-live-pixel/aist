import type { JsonObject, JsonValue, RuntimeToolResult } from '../../../shared/types/types';

/** Что это: приводит arbitrary record к RuntimeToolResult; зачем нужно: events/run repository хранят JSON-safe payload; проблема: runtime не пишет функции/undefined в историю. */
export function toRuntimeToolResult({ result }: { result: Record<string, unknown> }): RuntimeToolResult {
  return toJsonObject({ value: result });
}

/** Что это: приводит record к JsonObject; зачем нужно: tool args/result могут содержать вложенные значения; проблема: protocol получает сериализуемые данные. */
export function toJsonObject({ value }: { value: Record<string, unknown> }): JsonObject {
  const result: JsonObject = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = toJsonValue({ value: item });
  }
  return result;
}

/** Что это: приводит unknown к JsonValue; зачем нужно: безопасно сериализовать tool output; проблема: model/run events не ломаются на нестандартных значениях. */
export function toJsonValue({ value }: { value: unknown }): JsonValue | undefined {
  if (value === undefined) return undefined;
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return value;
  if (Array.isArray(value)) return value.map((item) => toJsonValue({ value: item }) ?? null);
  if (value && typeof value === 'object') return toJsonObject({ value: value as Record<string, unknown> });
  return String(value);
}
