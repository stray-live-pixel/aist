import * as vscode from 'vscode';

import { buildMergeToMainPrompt } from '../vcs/chatVcs';
import type { AgentControllerCallbacks } from './AgentControllerCallbacks';
import type { AgentControllerState } from './AgentControllerState';

/** Что это: refresh VCS активного чата; зачем нужно: sidebar показывает branch/isolation; проблема: VCS badge актуален после старта extension. */
export async function refreshActiveChatVcs({
  state,
  callbacks
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
}): Promise<void> {
  await refreshChatVcs({ state, callbacks, chatId: state.chats.getActiveChat().id }).catch((error) =>
    state.logger.info('Failed to refresh active chat VCS state', {
      error: error instanceof Error ? error.message : String(error)
    })
  );
}

/** Что это: refresh VCS конкретного чата; зачем нужно: chat store хранит локальный VCS snapshot; проблема: UI видит текущую ветку. */
export async function refreshChatVcs({
  state,
  callbacks,
  chatId
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
  chatId: string;
}): Promise<void> {
  const vcsState = await state.chatVcs.getCurrentState();
  state.chats.setVcsState(chatId, vcsState);
  callbacks.sendState();
  if (!vcsState) {
    state.logger.info('VCS refresh skipped: workspace is not a repository');
  }
}

/** Что это: создаёт isolated branch для чата; зачем нужно: пользователь может безопасно работать в отдельной ветке; проблема: статус ветки сразу виден в UI. */
export async function isolateChatVcs({
  state,
  callbacks,
  chatId
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
  chatId: string;
}): Promise<void> {
  const vcsState = await state.chatVcs.createIsolatedBranch(chatId);
  state.chats.setVcsState(chatId, vcsState);
  callbacks.sendState();
  vscode.window.setStatusBarMessage(`AIST VCS: switched to ${vcsState.branch}`, 2400);
}

/** Что это: commit and force push для isolated chat branch; зачем нужно: агентские изменения можно отправить в remote; проблема: пользователь видит итоговую branch в status bar. */
export async function commitAndForcePushChatVcs({
  state,
  callbacks,
  chatId
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
  chatId: string;
}): Promise<void> {
  const chat = state.chats.getChat(chatId) || state.chats.getActiveChat();
  const vcsState = await state.chatVcs.commitAndForcePush(`AIST changes from ${chat.title}`);
  state.chats.setVcsState(chat.id, vcsState);
  callbacks.sendState();
  vscode.window.setStatusBarMessage(`AIST VCS: pushed ${vcsState.branch} with --force`, 2400);
}

/** Что это: просит агента merge isolated branch to main; зачем нужно: merge выполняется через обычный chat prompt; проблема: агент учитывает текущий VCS context. */
export async function mergeChatVcsToMain({
  state,
  callbacks,
  chatId
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
  chatId: string;
}): Promise<void> {
  const chat = state.chats.getChat(chatId) || state.chats.getActiveChat();
  const prompt = buildMergeToMainPrompt(chat.vcs);
  await callbacks.ask(chat.id, prompt);
}
