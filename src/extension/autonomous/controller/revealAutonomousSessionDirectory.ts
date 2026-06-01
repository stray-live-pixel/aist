import * as vscode from 'vscode';

import { AutonomousSessionStore } from '../../../core/processes/autonomous';
import { getWorkspaceFolder } from '../../shared/workspace';

/**
 * Что это: открывает каталог автономной сессии во внешнем проводнике/VS Code окружении.
 * Зачем нужно: пользователь может быстро посмотреть артефакты запуска runner-а.
 * Какую проблему решает: controller не хранит детали расположения session-store.
 */
export async function revealAutonomousSessionDirectory({ sessionId }: { sessionId: string }): Promise<void> {
  const sessionUri = vscode.Uri.file(
    new AutonomousSessionStore(getWorkspaceFolder().uri.fsPath).rootPath + `/${sessionId}`
  );
  await vscode.env.openExternal(sessionUri);
}
