/**
 * Core остаётся независимым от VS Code API, чтобы один и тот же runtime можно
 * было подключать из CLI и из VS Code adapter без скрытой зависимости от editor host.
 */
export interface CoreRuntimeBoundary {
  readonly layer: 'core';
  readonly vscodeImportsAllowed: false;
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;
export type JsonObject = {
  [key: string]: JsonValue | undefined;
};
