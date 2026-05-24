import * as vscode from 'vscode';

/**
 * Переводит 1-based координаты из webview/tool output в безопасную позицию VS Code.
 *
 * UI и инструменты передают line/column как человекочитаемые значения, а VS Code
 * API ожидает 0-based Position. Функция также ограничивает координаты границами
 * документа, чтобы открыть файл даже при устаревшей ссылке на строку.
 */
export function getDocumentPosition(document: vscode.TextDocument, line?: number, column?: number): vscode.Position {
  const targetLine = Math.min(document.lineCount - 1, Math.max(0, Number(line || 1) - 1));
  const lineText = document.lineAt(targetLine).text;
  const targetColumn = Math.min(lineText.length, Math.max(0, Number(column || 1) - 1));

  return new vscode.Position(targetLine, targetColumn);
}
