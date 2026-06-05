import type { ToolPermissionMode } from '../../types';

/**
 * Что это: локализованное имя режима доступа к tool.
 * Зачем нужно: defaultPermission выводится текстом, а не значением enum, чтобы строка была понятна пользователю.
 */
export function formatPermission(permission: ToolPermissionMode, t: (key: never) => string): string {
  return permission === 'auto' ? t('settings.permission.auto' as never) : t('settings.permission.ask' as never);
}
