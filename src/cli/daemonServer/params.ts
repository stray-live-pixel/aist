import type { JsonValue } from '../../core/shared/types/types';
import { DaemonRpcError } from './DaemonRpcError';
import { isJsonObject, isJsonValue } from './jsonGuards';

/**
 * Что это: требует JSON-object params.
 * Зачем нужно: RPC handlers работают с именованными полями и должны валидировать вход.
 * Какую продуктовую проблему решает: клиент получает точную ошибку params.invalid.
 */
export function requireRecord({ value, label }: { value: unknown; label: string }): Record<string, unknown> {
  if (!isJsonObject(value)) {
    throw new DaemonRpcError(-32602, 'params.invalid', `${label} must be an object.`);
  }
  return value;
}

/**
 * Что это: возвращает пустой объект для отсутствующих params.
 * Зачем нужно: optional RPC params не требуют от клиента отправлять {}.
 * Какую продуктовую проблему решает: команды stop/list/config удобны для CLI и webview.
 */
export function asOptionalRecord({ value }: { value: unknown }): Record<string, unknown> {
  if (value === undefined || value === null) {
    return {};
  }
  return requireRecord({ value, label: 'params' });
}

/**
 * Что это: требует непустую строку из params.
 * Зачем нужно: chatId/model/key/sessionId не должны быть пустыми.
 * Какую продуктовую проблему решает: daemon не создаёт странные записи по пустым идентификаторам.
 */
export function requireString({ input, key }: { input: Record<string, unknown>; key: string }): string {
  const value = input[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new DaemonRpcError(-32602, 'params.invalid', `Param '${key}' must be a non-empty string.`, { key });
  }
  return value;
}

/**
 * Что это: читает optional непустую строку из params.
 * Зачем нужно: многие daemon команды имеют необязательные фильтры/модели/форматы.
 * Какую продуктовую проблему решает: undefined и пустая строка не расходятся как разные источники правды.
 */
export function optionalString({ input, key }: { input: Record<string, unknown>; key: string }): string | undefined {
  const value = input[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * Что это: читает optional finite number из params.
 * Зачем нужно: числовые настройки должны игнорировать NaN/Infinity.
 * Какую продуктовую проблему решает: некорректный ввод не ломает config/runtime расчёты.
 */
export function optionalNumber({ input, key }: { input: Record<string, unknown>; key: string }): number | undefined {
  const value = input[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Что это: требует JSON-serializable value.
 * Зачем нужно: config.update принимает только значения, которые можно сохранить и вернуть по JSON-RPC.
 * Какую продуктовую проблему решает: настройки не портятся невалидными JS-значениями.
 */
export function requireJsonValue({ value, key }: { value: unknown; key: string }): JsonValue {
  if (!isJsonValue(value)) {
    throw new DaemonRpcError(-32602, 'params.invalid', `Param '${key}' must be JSON-serializable.`, { key });
  }
  return value;
}
