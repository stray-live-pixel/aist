import * as vscode from 'vscode';

/**
 * Что это: получает корневую папку текущего VS Code workspace.
 * Зачем нужно: daemon runtime привязан к одному открытому workspace.
 * Какую продуктовую проблему решает: пользователь получает понятную ошибку, если пытается запустить AIST без папки проекта.
 */
export function getWorkspaceRoot(): string {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    throw new Error('Open a VS Code workspace folder before using the AIST daemon runtime.');
  }

  return folder.uri.fsPath;
}
