import * as vscode from 'vscode';

import { getErrorMessage } from '../../../shared/errors';
import type { WebviewMessage } from '../../types';
import type { AgentWebviewMessageDeps } from './types';

type CodexMessage = Extract<WebviewMessage, { type: 'codexLogin' } | { type: 'codexLogout' }>;

export function isCodexMessage(message: WebviewMessage): message is CodexMessage {
  return message.type === 'codexLogin' || message.type === 'codexLogout';
}

/**
 * Обрабатывает авторизацию ChatGPT Codex из webview.
 *
 * При ошибке состояние авторизации перечитывается заново: UI не должен оставаться
 * в оптимистичном состоянии, если login/logout оборвался исключением.
 */
export async function handleWebviewCodexMessage(message: CodexMessage, deps: AgentWebviewMessageDeps): Promise<void> {
  try {
    if (message.type === 'codexLogin') {
      await deps.loginCodex();
      return;
    }
    await deps.logoutCodex();
  } catch (error) {
    const action = message.type === 'codexLogin' ? 'login' : 'logout';
    deps.logger.error(`ChatGPT Codex ${action} failed`, error);
    vscode.window.showErrorMessage(`aist: ChatGPT Codex ${action} failed — ${getErrorMessage(error)}`);
    await deps.refreshCodexAuthState();
  }
}
