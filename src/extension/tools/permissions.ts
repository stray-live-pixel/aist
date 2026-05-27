import * as vscode from 'vscode';

import { filesystemTools } from './filesystemTools';
import { planningTools } from './planningTools';

export type ToolPermissionMode = 'ask' | 'auto';

export type ToolPermissionItem = {
  name: string;
  description: string;
  permission: ToolPermissionMode;
  defaultPermission: ToolPermissionMode;
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
  apply_patch: 'ask',
  create_directory: 'ask',
  delete_path: 'ask',
  create_plan: 'ask',
  update_plan: 'ask',
  set_plan_item_status: 'auto'
};

const permissionTools = [...filesystemTools, ...planningTools];

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

  for (const tool of permissionTools) {
    const name = tool.function.name;
    permissions[name] = normalizePermission(configured[name], DEFAULT_TOOL_PERMISSIONS[name] || 'ask');
  }

  return permissions;
}

export function getToolPermission(toolName: string): ToolPermissionMode {
  return getToolPermissions()[toolName] || DEFAULT_TOOL_PERMISSIONS[toolName] || 'ask';
}

export function getToolPermissionItems(): ToolPermissionItem[] {
  const permissions = getToolPermissions();

  return permissionTools.map((tool) => ({
    name: tool.function.name,
    description: tool.function.description,
    permission: permissions[tool.function.name] || 'ask',
    defaultPermission: DEFAULT_TOOL_PERMISSIONS[tool.function.name] || 'ask'
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

function normalizePermissionMap(source: Record<string, unknown>): Record<string, ToolPermissionMode> {
  const permissions: Record<string, ToolPermissionMode> = {};

  for (const tool of permissionTools) {
    const name = tool.function.name;
    permissions[name] = normalizePermission(source[name], DEFAULT_TOOL_PERMISSIONS[name] || 'ask');
  }

  return permissions;
}

function permissionMapsEqual(
  left: Record<string, ToolPermissionMode>,
  right: Record<string, ToolPermissionMode>
): boolean {
  return permissionTools.every((tool) => {
    const name = tool.function.name;
    return left[name] === right[name];
  });
}

function normalizePermission(value: unknown, fallback: ToolPermissionMode): ToolPermissionMode {
  return value === 'auto' || value === 'ask' ? value : fallback;
}
