import * as vscode from 'vscode';

/**
 * Что это: читает, должен ли агент обязательно объяснять каждый tool-call через reason/nextStep.
 * Зачем нужно: быстрый режим отключает обязательные пояснения без изменения самих инструментов.
 * Какую продуктовую проблему решает: пользователь экономит токены и ускоряет выполнение задач, когда подробная трассировка не нужна.
 */
export function getToolCallNotesRequired(): boolean {
  return vscode.workspace.getConfiguration('openrouterAgent').get<boolean>('toolCallNotesRequired') !== false;
}

/**
 * Что это: сохраняет режим обязательных tool-call пояснений в workspace-настройку.
 * Зачем нужно: кнопка в Composer должна быть устойчивой между перезагрузками webview.
 * Какую продуктовую проблему решает: выбранный быстрый режим продолжает работать в следующих запросах без повторного клика.
 */
export async function setToolCallNotesRequired({ required }: { required: boolean }): Promise<void> {
  await vscode.workspace
    .getConfiguration('openrouterAgent')
    .update('toolCallNotesRequired', required, vscode.ConfigurationTarget.Workspace);
}
