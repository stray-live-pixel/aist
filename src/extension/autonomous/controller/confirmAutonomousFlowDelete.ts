import * as vscode from 'vscode';

const CONFIRM_DELETE_FLOW = 'Удалить flow';

/**
 * Что это: показывает пользователю подтверждение удаления autonomous flow.
 * Зачем нужно: удаление меняет workspace-файлы и не должно происходить случайно.
 * Какую проблему решает: controller не смешивает IPC-маршрутизацию с текстами modal dialog.
 */
export async function confirmAutonomousFlowDelete({ flowId }: { flowId: string }): Promise<boolean> {
  const selected = await vscode.window.showWarningMessage(
    `Удалить flow ${flowId}? Это удалит каталог definition из .aist-agent/autonomous/flows.`,
    { modal: true },
    CONFIRM_DELETE_FLOW
  );
  return selected === CONFIRM_DELETE_FLOW;
}
