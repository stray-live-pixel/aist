import { DEFAULT_TOOL_PERMISSIONS } from '../defaultToolPermissions';
import type { ToolPermissionPreset } from '../types';

/**
 * Что это: сбалансированный пресет разрешений.
 * Зачем нужно: агент быстро читает проект, но спрашивает перед командами, изменениями файлов и запуском навыков.
 */
export const balancedPreset: ToolPermissionPreset = {
  id: 'balanced',
  label: 'Balanced',
  description: 'Read and search automatically; ask before shell commands and file changes.',
  permissions: DEFAULT_TOOL_PERMISSIONS
};
