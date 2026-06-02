import { workspaceSettingsFile } from './workspaceSettingsFile';

export function workspaceConfigFile(workspaceRoot: string): string {
  return workspaceSettingsFile(workspaceRoot);
}
