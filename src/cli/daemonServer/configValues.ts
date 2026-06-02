import type { ConfigScope } from '../../core/app/config/config';
import type { JsonObject, JsonValue, ToolPermissionMode } from '../../core/shared/types/types';
import { DaemonRpcError } from './DaemonRpcError';
import type { RedactedConfigValue } from './RedactedConfigValue';
import { REDACTED_VALUE } from './constants';
import { isSecretLikeConfigPath } from './isSecretLikeConfigPath';
import { isJsonObject } from './jsonGuards';

/**
 * Что это: нормализует config scope из RPC params.
 * Зачем нужно: config.update должен явно писать global или workspace настройки.
 * Какую продуктовую проблему решает: настройки не попадают случайно не в тот слой.
 */
export function normalizeConfigScope({ value }: { value: string }): ConfigScope {
  if (value === 'global' || value === 'workspace') {
    return value;
  }
  throw new DaemonRpcError(-32602, 'params.invalid', 'Config scope must be global or workspace.', { scope: value });
}

/**
 * Что это: нормализует permission map project tools.
 * Зачем нужно: daemon принимает только ask/auto и игнорирует мусорные значения.
 * Какую продуктовую проблему решает: безопасность tools не ломается невалидным config payload.
 */
export function normalizeToolPermissionsSetting({ value }: { value: unknown }): Record<string, ToolPermissionMode> {
  if (!isJsonObject(value)) {
    return {};
  }
  const permissions: Record<string, ToolPermissionMode> = {};
  for (const [toolName, permission] of Object.entries(value)) {
    if (permission === 'ask' || permission === 'auto') {
      permissions[toolName] = permission;
    }
  }
  return permissions;
}

/**
 * Что это: читает value по dotted path из settings object.
 * Зачем нужно: legacy и nested keys поддерживаются одним helper-ом.
 * Какую продуктовую проблему решает: старые настройки остаются совместимыми после изменения структуры config.
 */
export function getJsonPath({ settings, key }: { settings: JsonObject; key: string }): JsonValue | undefined {
  if (Object.prototype.hasOwnProperty.call(settings, key)) {
    return settings[key];
  }
  const segments = key.split('.');
  let current: JsonValue | undefined = settings;
  for (const segment of segments) {
    if (!isJsonObject(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

/**
 * Что это: маскирует секреты в config value.
 * Зачем нужно: config.get может показать структуру настроек без раскрытия токенов.
 * Какую продуктовую проблему решает: UI не выводит API keys в открытом виде.
 */
export function redactConfigValue({ key, value }: { key: string; value: JsonValue | undefined }): RedactedConfigValue {
  if (value === undefined) {
    return { value, redacted: false };
  }
  if (isSecretLikeConfigPath({ key })) {
    return { value: REDACTED_VALUE, redacted: true };
  }
  if (Array.isArray(value)) {
    return redactConfigArray({ key, value });
  }
  if (isJsonObject(value)) {
    return redactConfigObject({ key, value });
  }
  return { value, redacted: false };
}

function redactConfigArray({ key, value }: { key: string; value: JsonValue[] }): RedactedConfigValue {
  let redacted = false;
  const items = value.map((item) => {
    const result = redactConfigValue({ key, value: item });
    redacted = redacted || result.redacted;
    return result.value ?? null;
  });
  return { value: items, redacted };
}

function redactConfigObject({ key, value }: { key: string; value: JsonObject }): RedactedConfigValue {
  let redacted = false;
  const result: JsonObject = {};
  for (const [childKey, childValue] of Object.entries(value)) {
    if (childValue === undefined) {
      continue;
    }
    const pathKey = key ? `${key}.${childKey}` : childKey;
    const child = redactConfigValue({ key: pathKey, value: childValue });
    redacted = redacted || child.redacted;
    result[childKey] = child.value;
  }
  return { value: result, redacted };
}

/**
 * Что это: проверяет, содержит ли value секретный путь.
 * Зачем нужно: config.update запрещает отправлять redacted secret обратно в storage.
 * Какую продуктовую проблему решает: placeholder <redacted> не перезаписывает реальный секрет.
 */
export function containsSecretLikePath({ key, value }: { key: string; value: JsonValue }): boolean {
  if (isSecretLikeConfigPath({ key })) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsSecretLikePath({ key, value: item }));
  }
  if (isJsonObject(value)) {
    return Object.entries(value).some(([childKey, childValue]) => {
      return (
        childValue !== undefined &&
        containsSecretLikePath({ key: key ? `${key}.${childKey}` : childKey, value: childValue })
      );
    });
  }
  return false;
}
