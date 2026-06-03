import * as vscode from 'vscode';

import { normalizeVcsCommand } from './normalizeVcsCommand';

/**
 * Что это: сохраняет команду git-like VCS в workspace settings.
 * Зачем нужно: настройка должна применяться ко всему проекту и переживать перезапуск VS Code.
 * Какую продуктовую проблему решает: команда arc/git меняется из UI настроек без ручного редактирования JSON.
 */
export async function setVcsCommand({ command }: { command: string }): Promise<void> {
  await vscode.workspace
    .getConfiguration('openrouterAgent')
    .update('vcsCommand', normalizeVcsCommand({ value: command }), vscode.ConfigurationTarget.Workspace);
}
