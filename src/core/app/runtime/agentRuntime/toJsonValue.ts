import type { JsonObject, JsonValue } from '../../../shared/types/types';

/**
 * Что это: приводит произвольный record к JsonObject, безопасному для runtime events.
 * Зачем нужно: события агента должны сериализоваться одинаково в CLI, daemon и webview.
 * Какую продуктовую проблему решает: UI не падает на не-JSON значениях в args/result tool-сообщений.
 */
export function toJsonObject(value: Record<string, unknown>): JsonObject {
  const result: JsonObject = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = toJsonValue({ value: item });
  }
  return result;
}

/**
 * Что это: нормализует любое значение до JsonValue или undefined.
 * Зачем нужно: runtime-события могут проходить через JSON-RPC и persisted storage.
 * Какую продуктовую проблему решает: сложные tool payloads не ломают отображение истории запуска.
 */
export function toJsonValue({ value }: { value: unknown }): JsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue({ value: item }) ?? null);
  }
  if (value && typeof value === 'object') {
    return toJsonObject(value as Record<string, unknown>);
  }
  return String(value);
}
