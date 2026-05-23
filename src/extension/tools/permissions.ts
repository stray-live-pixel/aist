import * as vscode from 'vscode';
import { filesystemTools } from './filesystemTools';

export type ToolPermissionMode = 'ask' | 'auto';

export type ToolPermissionItem = {
  name: string;
  description: string;
  permission: ToolPermissionMode;
  defaultPermission: ToolPermissionMode;
};

export const DEFAULT_TOOL_PERMISSIONS: Record<string, ToolPermissionMode> = {
  get_workspace_info: 'auto',
  list_files: 'auto',
  read_file: 'auto',
  grep_search: 'auto',
  write_file: 'ask',
  replace_in_file: 'ask',
  create_directory: 'ask',
  delete_path: 'ask'
};

export function getToolPermissions(): Record<string, ToolPermissionMode> {
  const configured = vscode.workspace.getConfiguration('openrouterAgent').get<Record<string, unknown>>('toolPermissions') || {};
  const permissions: Record<string, ToolPermissionMode> = {};

  for (const tool of filesystemTools) {
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

  return filesystemTools.map((tool) => ({
    name: tool.function.name,
    description: tool.function.description,
    permission: permissions[tool.function.name] || 'ask',
    defaultPermission: DEFAULT_TOOL_PERMISSIONS[tool.function.name] || 'ask'
  }));
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

function normalizePermission(value: unknown, fallback: ToolPermissionMode): ToolPermissionMode {
  return value === 'auto' || value === 'ask' ? value : fallback;
}
