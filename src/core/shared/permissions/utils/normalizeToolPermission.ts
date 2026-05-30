import type { ToolPermissionMode } from '../../types/types';

/**
 * Что это: приводит неизвестное значение к разрешению инструмента.
 * Зачем нужно: настройки приходят из JSON, поэтому runtime должен безопасно откатываться к продуктово выбранному fallback.
 */
export function normalizeToolPermission(params: { value: unknown; fallback: ToolPermissionMode }): ToolPermissionMode {
  return params.value === 'auto' || params.value === 'ask' ? params.value : params.fallback;
}
