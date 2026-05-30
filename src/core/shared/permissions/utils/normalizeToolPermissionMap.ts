import type { ToolPermissionMode } from '../../types/types';
import { normalizeToolPermission } from './normalizeToolPermission';

/**
 * Что это: нормализует карту разрешений под список доступных инструментов.
 * Зачем нужно: пресеты общие, а конкретный runtime может иметь разные project tools и skills.
 */
export function normalizeToolPermissionMap(params: {
  source: Record<string, unknown>;
  tools: Array<{ name: string; defaultPermission: ToolPermissionMode }>;
}): Record<string, ToolPermissionMode> {
  const permissions: Record<string, ToolPermissionMode> = {};

  // Для каждого доступного инструмента берем значение пресета или fallback самого инструмента.
  for (const tool of params.tools) {
    permissions[tool.name] = normalizeToolPermission({
      value: params.source[tool.name],
      fallback: tool.defaultPermission
    });
  }

  return permissions;
}
