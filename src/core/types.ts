/**
 * Core остаётся независимым от VS Code API, чтобы один и тот же runtime можно
 * было подключать из CLI и из VS Code adapter без скрытой зависимости от editor host.
 */
export interface CoreRuntimeBoundary {
  readonly layer: 'core';
  readonly vscodeImportsAllowed: false;
}
