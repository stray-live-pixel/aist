import type { ToolPermissionMode } from '../../types/types';

/**
 * Что это: сравнивает две карты разрешений только по доступным инструментам.
 * Зачем нужно: UI должен понимать, совпадают ли текущие настройки с одним из общих пресетов.
 */
export function areToolPermissionMapsEqual(params: {
  left: Record<string, ToolPermissionMode>;
  right: Record<string, ToolPermissionMode>;
  tools: Array<{ name: string }>;
}): boolean {
  return params.tools.every((tool) => params.left[tool.name] === params.right[tool.name]);
}
