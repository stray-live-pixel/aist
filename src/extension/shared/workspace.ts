import path from 'node:path';
import * as vscode from 'vscode';

export function getWorkspaceFolder(): vscode.WorkspaceFolder {
  const folders = vscode.workspace.workspaceFolders || [];
  if (!folders.length) {
    throw new Error('Open a VS Code workspace folder before using filesystem tools.');
  }

  return folders[0];
}

export function getWorkspaceName(): string {
  const folders = vscode.workspace.workspaceFolders || [];
  return folders[0]?.name || 'No workspace';
}

export function resolveWorkspacePath(relativePath: string): vscode.Uri {
  const folder = getWorkspaceFolder();
  const rootPath = folder.uri.fsPath;
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const targetPath = path.resolve(rootPath, normalized);
  const relativeToRoot = path.relative(rootPath, targetPath);

  if (relativeToRoot === '..' || relativeToRoot.startsWith(`..${path.sep}`) || path.isAbsolute(relativeToRoot)) {
    throw new Error(`Path is outside the workspace: ${relativePath}`);
  }

  return vscode.Uri.file(targetPath);
}
