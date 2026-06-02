import * as vscode from 'vscode';

export function updateWorkspaceSetting(key: string, value: unknown): Thenable<void> {
  return vscode.workspace.getConfiguration('openrouterAgent').update(key, value, vscode.ConfigurationTarget.Workspace);
}
