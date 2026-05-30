import type { ToolPermissionMode } from '../types/types';

/**
 * Что это: идентификатор общего пресета разрешений инструментов.
 * Зачем нужно: CLI, daemon и VS Code UI должны одинаково понимать продуктовые режимы безопасности.
 */
export type ToolPermissionPresetId = 'confirm-all' | 'balanced' | 'fast-edit' | 'autonomous';

/**
 * Что это: описание одного пресета разрешений инструментов.
 * Зачем нужно: UI показывает label/description, а runtime применяет единую карту ask/auto.
 */
export type ToolPermissionPreset = {
  id: ToolPermissionPresetId;
  label: string;
  description: string;
  permissions: Record<string, ToolPermissionMode>;
};

/**
 * Что это: режим безопасности headless CLI.
 * Зачем нужно: CLI работает без webview, но должен выбирать те же карты разрешений из общего источника.
 */
export type HeadlessToolApprovalMode = 'ask' | 'auto-readonly' | 'auto-all' | 'deny';
