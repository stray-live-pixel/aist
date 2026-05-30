import type { ToolPermissionMode } from '../types/types';
import { autonomousPreset } from './presets/autonomousPreset';
import { balancedPreset } from './presets/balancedPreset';
import { confirmAllPreset } from './presets/confirmAllPreset';
import { fastEditPreset } from './presets/fastEditPreset';
import type { HeadlessToolApprovalMode, ToolPermissionPreset, ToolPermissionPresetId } from './types';
import { normalizeToolPermissionMap } from './utils/normalizeToolPermissionMap';

/**
 * Что это: единый порядок общих пресетов разрешений.
 * Зачем нужно: UI показывает пресеты стабильно, а CLI/backend используют те же продуктовые режимы.
 */
const TOOL_PERMISSION_PRESETS: ToolPermissionPreset[] = [
  confirmAllPreset,
  balancedPreset,
  fastEditPreset,
  autonomousPreset
];

/**
 * Что это: возвращает общие пресеты, нормализованные под доступные инструменты.
 * Зачем нужно: skill/project tools появляются динамически, но выбранный режим должен одинаково применяться в UI и backend.
 */
export function getToolPermissionPresets(params: {
  tools: Array<{ name: string; defaultPermission: ToolPermissionMode }>;
}): ToolPermissionPreset[] {
  return TOOL_PERMISSION_PRESETS.map((preset) => ({
    ...preset,
    permissions: normalizeToolPermissionMap({ source: preset.permissions, tools: params.tools })
  }));
}

/**
 * Что это: ищет общий пресет по id.
 * Зачем нужно: обработчики настроек применяют пресет по короткому идентификатору из UI или CLI.
 */
export function getToolPermissionPreset(params: {
  presetId: string;
  tools: Array<{ name: string; defaultPermission: ToolPermissionMode }>;
}): ToolPermissionPreset | undefined {
  return getToolPermissionPresets({ tools: params.tools }).find((preset) => preset.id === params.presetId);
}

/**
 * Что это: переводит headless CLI policy в общий пресет разрешений.
 * Зачем нужно: CLI больше не держит отдельную карту правил и не расходится с extension-пресетами.
 */
export function getHeadlessToolPermissionPresetId(params: {
  approvalMode: HeadlessToolApprovalMode;
}): ToolPermissionPresetId {
  if (params.approvalMode === 'auto-readonly') return 'balanced';
  if (params.approvalMode === 'auto-all') return 'autonomous';
  return 'confirm-all';
}

/**
 * Что это: вычисляет разрешение инструмента для headless CLI mode.
 * Зачем нужно: chat ask без webview использует те же пресеты, что и UI, включая run_skill.
 */
export function getHeadlessToolPermission(params: {
  approvalMode: HeadlessToolApprovalMode;
  toolName: string;
  tools: Array<{ name: string; defaultPermission: ToolPermissionMode }>;
}): ToolPermissionMode {
  const presetId = getHeadlessToolPermissionPresetId({ approvalMode: params.approvalMode });
  const preset = getToolPermissionPreset({ presetId, tools: params.tools });
  const tool = params.tools.find((item) => item.name === params.toolName);

  return preset?.permissions[params.toolName] || tool?.defaultPermission || 'ask';
}
