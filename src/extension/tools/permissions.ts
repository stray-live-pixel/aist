import * as vscode from 'vscode';

import { planningTools } from '../../core/features/planning/planningTools';
import {
  DEFAULT_TOOL_PERMISSIONS,
  type ToolPermissionPreset,
  areToolPermissionMapsEqual,
  getToolPermissionPresets as getSharedToolPermissionPresets,
  getToolPermissionPreset,
  normalizeToolPermission
} from '../../core/shared/permissions';
import type { ToolPermissionMode } from '../../core/shared/types/types';
import { nodeFilesystemTools } from '../../core/tools/fs/node_filesystem_tools/nodeFilesystemTools';
import { getDaemonToolCatalog } from '../agent/daemon/toolCatalog';

export type { ToolPermissionMode, ToolPermissionPreset };

export type ToolPermissionItem = {
  name: string;
  label?: string;
  description: string;
  permission: ToolPermissionMode;
  defaultPermission: ToolPermissionMode;
  source?: 'builtin' | 'skill' | 'project';
  enabled?: boolean;
  version?: string;
};

const permissionTools = [...nodeFilesystemTools, ...planningTools];

/**
 * Что это: читает текущую карту разрешений VS Code workspace.
 * Зачем нужно: extension должен показывать и применять те же разрешения, которые использует runtime при tool calls.
 */
export function getToolPermissions(): Record<string, ToolPermissionMode> {
  const configured =
    vscode.workspace.getConfiguration('openrouterAgent').get<Record<string, unknown>>('toolPermissions') || {};
  const permissions: Record<string, ToolPermissionMode> = {};

  for (const item of getPermissionToolMetadata()) {
    permissions[item.name] = normalizeToolPermission({
      value: configured[item.name],
      fallback: item.defaultPermission
    });
  }

  return permissions;
}

/**
 * Что это: возвращает разрешение конкретного инструмента.
 * Зачем нужно: runtime быстро решает, запускать tool автоматически или запрашивать подтверждение.
 */
export function getToolPermission(toolName: string): ToolPermissionMode {
  return getToolPermissions()[toolName] || DEFAULT_TOOL_PERMISSIONS[toolName] || 'ask';
}

/**
 * Что это: возвращает список инструментов с текущими разрешениями.
 * Зачем нужно: UI настроек показывает пользователю фактическое состояние безопасности.
 */
export function getToolPermissionItems(): ToolPermissionItem[] {
  const permissions = getToolPermissions();

  return getPermissionToolMetadata().map((tool) => ({
    ...tool,
    permission: permissions[tool.name] || tool.defaultPermission
  }));
}

/**
 * Что это: возвращает общие пресеты, нормализованные под инструменты extension.
 * Зачем нужно: UI не хранит собственные пресеты и не расходится с CLI/backend.
 */
export function getToolPermissionPresets(): ToolPermissionPreset[] {
  return getSharedToolPermissionPresets({ tools: getPermissionToolMetadata() });
}

/**
 * Что это: определяет активный пресет по текущим настройкам.
 * Зачем нужно: UI подсвечивает выбранный режим или custom, если пользователь изменил отдельные tools.
 */
export function getActiveToolPermissionPresetId(): string | 'custom' {
  const permissions = getToolPermissions();
  const tools = getPermissionToolMetadata();

  for (const preset of getSharedToolPermissionPresets({ tools })) {
    if (areToolPermissionMapsEqual({ left: permissions, right: preset.permissions, tools })) {
      return preset.id;
    }
  }

  return 'custom';
}

/**
 * Что это: сохраняет permission для одного инструмента.
 * Зачем нужно: пользователь может точечно усилить или ослабить подтверждение без выбора полного пресета.
 */
export async function setToolPermission(toolName: string, permission: ToolPermissionMode): Promise<void> {
  const nextPermissions = {
    ...getToolPermissions(),
    [toolName]: permission
  };

  await vscode.workspace
    .getConfiguration('openrouterAgent')
    .update('toolPermissions', nextPermissions, vscode.ConfigurationTarget.Workspace);
}

/**
 * Что это: применяет общий пресет разрешений к workspace settings.
 * Зачем нужно: один клик в UI переводит весь набор tools в понятный режим безопасности.
 */
export async function setToolPermissionPreset(presetId: string): Promise<boolean> {
  const preset = getToolPermissionPreset({ presetId, tools: getPermissionToolMetadata() });
  if (!preset) {
    return false;
  }

  await vscode.workspace
    .getConfiguration('openrouterAgent')
    .update('toolPermissions', preset.permissions, vscode.ConfigurationTarget.Workspace);
  return true;
}

/**
 * Что это: читает отключенные project tools.
 * Зачем нужно: пользователь может скрыть опасный или нерелевантный проектный инструмент из каталога агента.
 */
export function getDisabledProjectToolIds(): string[] {
  const configured =
    vscode.workspace.getConfiguration('openrouterAgent').get<unknown[]>('projectToolDisabledIds') || [];
  return configured.filter((item): item is string => typeof item === 'string');
}

/**
 * Что это: включает или отключает project tool для текущего workspace.
 * Зачем нужно: каталог инструментов должен отражать решение пользователя без изменения самих markdown-описаний tools.
 */
export async function setProjectToolEnabled(toolId: string, enabled: boolean): Promise<void> {
  const disabled = new Set(getDisabledProjectToolIds());
  if (enabled) {
    disabled.delete(toolId);
  } else {
    disabled.add(toolId);
  }

  await vscode.workspace
    .getConfiguration('openrouterAgent')
    .update('projectToolDisabledIds', [...disabled].sort(), vscode.ConfigurationTarget.Workspace);
}

/**
 * Что это: собирает metadata инструментов, для которых есть permission settings.
 * Зачем нужно: пресеты общие, но extension должен учитывать динамические skills и project tools текущего workspace.
 */
function getPermissionToolMetadata(): Omit<ToolPermissionItem, 'permission'>[] {
  const builtIns = permissionTools.map((tool) => ({
    name: tool.function.name,
    description: tool.function.description,
    defaultPermission: DEFAULT_TOOL_PERMISSIONS[tool.function.name] || 'ask',
    source: 'builtin' as const,
    enabled: true
  }));
  const snapshot = getDaemonToolCatalog().snapshot();
  const hasRunSkill = snapshot.tools.some((tool) => tool.function.name === 'run_skill');
  const skillTools = hasRunSkill
    ? [
        {
          name: 'run_skill',
          description: 'Run a user-defined custom skill by ID.',
          defaultPermission: DEFAULT_TOOL_PERMISSIONS.run_skill || 'ask',
          source: 'skill' as const,
          enabled: true
        }
      ]
    : [];
  const projectTools = snapshot.projectTools.map((tool) => ({
    name: tool.id,
    label: tool.label,
    description: tool.description,
    defaultPermission: tool.permission,
    source: 'project' as const,
    enabled: tool.enabled,
    version: tool.version
  }));

  return [...builtIns, ...skillTools, ...projectTools];
}
