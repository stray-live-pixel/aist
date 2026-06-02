import { type ToolPermissionMode } from '../../../shared/types/types';

export function normalizePermission(value: unknown): ToolPermissionMode {
  return value === 'auto' ? 'auto' : 'ask';
}
