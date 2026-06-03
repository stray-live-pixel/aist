import * as vscode from 'vscode';

import { normalizeVcsCommand } from './normalizeVcsCommand';

/**
 * Что это: читает команду git-like VCS из настроек VS Code.
 * Зачем нужно: проекты на arc или другой совместимой VCS не должны менять код AIST.
 * Какую продуктовую проблему решает: пользователь один раз указывает команду, а Composer и backend работают одинаково.
 */
export function getVcsCommand(): string {
  return normalizeVcsCommand({ value: vscode.workspace.getConfiguration('openrouterAgent').get<string>('vcsCommand') });
}
