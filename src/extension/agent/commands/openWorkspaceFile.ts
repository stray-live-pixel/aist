import * as vscode from 'vscode';

import { getErrorMessage } from '../../shared/errors';
import type { AistLogger } from '../../shared/logger';
import { resolveWorkspacePath } from '../../shared/workspace';
import { getDocumentPosition } from '../context/workspaceFiles';

/**
 * Открывает файл или директорию workspace по ссылке из webview/tool output.
 *
 * Webview передает путь как workspace-relative строку, а этот модуль изолирует
 * детали VS Code API: resolve uri, reveal directory, open document и безопасное
 * позиционирование курсора. Контроллеру не нужно знать про FileType/Selection.
 */
export async function openWorkspaceFile(params: {
  filePath: string;
  line?: number;
  column?: number;
  logger: AistLogger;
}): Promise<void> {
  try {
    const uri = resolveWorkspacePath(params.filePath);
    const stat = await vscode.workspace.fs.stat(uri);

    if (stat.type === vscode.FileType.Directory) {
      await vscode.commands.executeCommand('revealInExplorer', uri);
      return;
    }

    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document, { preview: false });
    const position = getDocumentPosition(document, params.line, params.column);

    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
  } catch (error) {
    params.logger.error('Failed to open workspace file from webview', error);
    vscode.window.showErrorMessage(`aist: failed to open ${params.filePath} — ${getErrorMessage(error)}`);
  }
}
