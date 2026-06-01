import type { JsonObject, JsonValue } from '../../core/shared/types/types';

/**
 * Что это: проверяет JSON-объект без массивов.
 * Зачем нужно: JSON-RPC params/config должны быть объектами перед чтением полей.
 * Какую продуктовую проблему решает: daemon возвращает понятную params.invalid ошибку вместо runtime crash.
 */
export function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Что это: проверяет, что значение можно безопасно сериализовать как JSON.
 * Зачем нужно: config.update и runtime events не должны принимать функции/символы/NaN.
 * Какую продуктовую проблему решает: JSON-RPC клиенты не получают невалидный payload.
 */
export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return Number.isFinite(value as number) || typeof value !== 'number';
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  if (isJsonObject(value)) {
    return Object.values(value).every((item) => item === undefined || isJsonValue(item));
  }
  return false;
}

/**
 * Что это: приводит JsonValue к JsonObject или пустому объекту.
 * Зачем нужно: config merge безопасно работает с отсутствующими или не-object секциями.
 * Какую продуктовую проблему решает: частичные настройки не ломают чтение defaults.
 */
export function asJsonObject({ value }: { value: JsonValue | undefined }): JsonObject {
  return isJsonObject(value) ? value : {};
}
