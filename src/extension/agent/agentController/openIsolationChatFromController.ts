import * as vscode from 'vscode';

import type { AgentControllerCallbacks } from './AgentControllerCallbacks';
import type { AgentControllerState } from './AgentControllerState';
import { findIsolationSessionById } from './findIsolationSessionById';
import { getIsolationStandardChatId } from './getIsolationStandardChatId';

/**
 * Что это: открывает стандартный чат isolated-сессии из controller-слоя VS Code.
 * Зачем нужно: UI может нажать Open standard chat даже если summary ещё не содержит chatId.
 * Какую продуктовую проблему решает: пользователь во время работы Docker-агента попадает в live-чат, а не видит серую кнопку или раннее предупреждение.
 */
export async function openIsolationChatFromController({
  state,
  callbacks,
  sessionId
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
  sessionId: string;
}): Promise<void> {
  const session = findIsolationSessionById({ state, sessionId });
  if (!session) {
    vscode.window.showWarningMessage('Isolated agent chat is not ready yet.');
    return;
  }

  const chatId = getIsolationStandardChatId({ session });
  if (!state.chats.getChat(chatId)) {
    await state.daemonRuntime.refreshState();
  }

  if (!state.chats.getChat(chatId)) {
    vscode.window.showWarningMessage('Isolated agent chat is not ready yet.');
    return;
  }

  callbacks.openChatInEditor(chatId);
}
