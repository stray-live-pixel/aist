import * as vscode from 'vscode';

import { nodeFilesystemTools } from '../../core/features/filesystem-tools/filesystemTools';
import { planningTools } from '../../core/features/planning/planningTools';
import type { ToolPermissionMode } from '../../core/shared/types/types';
import { getDaemonToolCatalog } from '../agent/daemon/toolCatalog';

export type { ToolPermissionMode };

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

export type ToolPermissionPreset = {
  id: string;
  label: string;
  description: string;
  permissions: Record<string, ToolPermissionMode>;
};

export const DEFAULT_TOOL_PERMISSIONS: Record<string, ToolPermissionMode> = {
  get_workspace_info: 'auto',
  list_files: 'auto',
  read_file: 'auto',
  read_file_range: 'auto',
  outline_file: 'auto',
  grep_search: 'auto',
  run_bash_script: 'ask',
  write_file: 'ask',
  replace_in_file: 'ask',
  edit_file: 'ask',
  apply_patch: 'ask',
  create_directory: 'ask',
  delete_path: 'ask',
  create_plan: 'ask',
  update_plan: 'ask',
  set_plan_item_status: 'auto'
};

const permissionTools = [...nodeFilesystemTools, ...planningTools];

export const TOOL_PERMISSION_PRESETS: ToolPermissionPreset[] = [
  {
    id: 'confirm-all',
    label: 'Confirm all',
    description: 'Ask before every tool call.',
    permissions: {
      get_workspace_info: 'ask',
      list_files: 'ask',
      read_file: 'ask',
      read_file_range: 'ask',
      outline_file: 'ask',
      grep_search: 'ask',
      run_bash_script: 'ask',
      write_file: 'ask',
      replace_in_file: 'ask',
      edit_file: 'ask',
      apply_patch: 'ask',
      create_directory: 'ask',
      delete_path: 'ask',
      create_plan: 'ask',
      update_plan: 'ask',
      set_plan_item_status: 'ask'
    }
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Read and search automatically; ask before shell commands and file changes.',
    permissions: DEFAULT_TOOL_PERMISSIONS
  },
  {
    id: 'fast-edit',
    label: 'Fast edit',
    description: 'Read, search, create, and edit automatically; ask before shell commands and deletion.',
    permissions: {
      get_workspace_info: 'auto',
      list_files: 'auto',
      read_file: 'auto',
      read_file_range: 'auto',
      outline_file: 'auto',
      grep_search: 'auto',
      run_bash_script: 'ask',
      write_file: 'auto',
      replace_in_file: 'auto',
      edit_file: 'ask',
      apply_patch: 'auto',
      create_directory: 'auto',
      delete_path: 'ask',
      create_plan: 'ask',
      update_plan: 'ask',
      set_plan_item_status: 'auto'
    }
  },
  {
    id: 'autonomous',
    label: 'Autonomous',
    description: 'Run every available tool automatically.',
    permissions: {
      get_workspace_info: 'auto',
      list_files: 'auto',
      read_file: 'auto',
      read_file_range: 'auto',
      outline_file: 'auto',
      grep_search: 'auto',
      run_bash_script: 'auto',
      write_file: 'auto',
      replace_in_file: 'auto',
      edit_file: 'ask',
      apply_patch: 'auto',
      create_directory: 'auto',
      delete_path: 'auto',
      create_plan: 'auto',
      update_plan: 'auto',
      set_plan_item_status: 'auto'
    }
  }
];

export function getToolPermissions(): Record<string, ToolPermissionMode> {
  const configured =
    vscode.workspace.getConfiguration('openrouterAgent').get<Record<string, unknown>>('toolPermissions') || {};
  const permissions: Record<string, ToolPermissionMode> = {};

  for (const item of getPermissionToolMetadata()) {
    permissions[item.name] = normalizePermission(configured[item.name], item.defaultPermission);
  }

  return permissions;
}

export function getToolPermission(toolName: string): ToolPermissionMode {
  return getToolPermissions()[toolName] || DEFAULT_TOOL_PERMISSIONS[toolName] || 'ask';
}

export function getToolPermissionItems(): ToolPermissionItem[] {
  const permissions = getToolPermissions();

  return getPermissionToolMetadata().map((tool) => ({
    ...tool,
    permission: permissions[tool.name] || tool.defaultPermission
  }));
}

export function getToolPermissionPresets(): ToolPermissionPreset[] {
  return TOOL_PERMISSION_PRESETS.map((preset) => ({
    ...preset,
    permissions: normalizePermissionMap(preset.permissions)
  }));
}

export function getActiveToolPermissionPresetId(): string | 'custom' {
  const permissions = getToolPermissions();

  for (const preset of getToolPermissionPresets()) {
    if (permissionMapsEqual(permissions, preset.permissions)) {
      return preset.id;
    }
  }

  return 'custom';
}

export async function setToolPermission(toolName: string, permission: ToolPermissionMode): Promise<void> {
  const nextPermissions = {
    ...getToolPermissions(),
    [toolName]: permission
  };

  await vscode.workspace
    .getConfiguration('openrouterAgent')
    .update('toolPermissions', nextPermissions, vscode.ConfigurationTarget.Workspace);
}

export async function setToolPermissionPreset(presetId: string): Promise<boolean> {
  const preset = getToolPermissionPresets().find((item) => item.id === presetId);
  if (!preset) {
    return false;
  }

  await vscode.workspace
    .getConfiguration('openrouterAgent')
    .update('toolPermissions', preset.permissions, vscode.ConfigurationTarget.Workspace);
  return true;
}

export function getDisabledProjectToolIds(): string[] {
  const configured =
    vscode.workspace.getConfiguration('openrouterAgent').get<unknown[]>('projectToolDisabledIds') || [];
  return configured.filter((item): item is string => typeof item === 'string');
}

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

function normalizePermissionMap(source: Record<string, unknown>): Record<string, ToolPermissionMode> {
  const permissions: Record<string, ToolPermissionMode> = {};

  for (const tool of getPermissionToolMetadata()) {
    permissions[tool.name] = normalizePermission(source[tool.name], tool.defaultPermission);
  }

  return permissions;
}

function permissionMapsEqual(
  left: Record<string, ToolPermissionMode>,
  right: Record<string, ToolPermissionMode>
): boolean {
  return getPermissionToolMetadata().every((tool) => left[tool.name] === right[tool.name]);
}

function normalizePermission(value: unknown, fallback: ToolPermissionMode): ToolPermissionMode {
  return value === 'auto' || value === 'ask' ? value : fallback;
}

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
          defaultPermission: 'ask' as const,
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
