import * as vscode from 'vscode';

/**
 * Что это: открывает экспорт autonomous session как временный документ VS Code.
 * Зачем нужно: пользователь сразу видит markdown/json результат без ручного сохранения файла.
 * Какую проблему решает: UI-сценарий экспорта отделён от получения данных из daemon/backend.
 */
export async function openAutonomousSessionExportDocument({
  content,
  format
}: {
  content: string;
  format: 'markdown' | 'json';
}): Promise<void> {
  const document = await vscode.workspace.openTextDocument({
    language: format === 'markdown' ? 'markdown' : 'json',
    content
  });
  await vscode.window.showTextDocument(document);
}
