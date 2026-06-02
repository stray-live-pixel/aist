import * as vscode from 'vscode';

import { t } from '../../shared/i18n';
import { buildEditSelectionPrompt } from '../commands/editSelectionPrompt';
import { replaceSelection, stripCodeFence } from '../context/editorContext';
import type { AgentControllerCallbacks } from './AgentControllerCallbacks';
import type { AgentControllerState } from './AgentControllerState';
import { reportControllerError } from './reportControllerError';

/**
 * Что это: command handler Edit Selection через daemon runtime.
 * Зачем нужно: пользователь выделяет код, вводит инструкцию, daemon возвращает замену.
 * Какую продуктовую проблему решает: inline-edit работает в daemon-only архитектуре без отдельного runtime в extension.
 */
export async function editSelectionCommand({
  state,
  callbacks
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
}): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage(t('editSelection.openFileFirst'));
    return;
  }
  const instruction = await vscode.window.showInputBox({
    title: t('editSelection.title'),
    prompt: t('editSelection.prompt'),
    placeHolder: t('editSelection.placeholder')
  });
  if (!instruction) return;

  try {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: t('editSelection.progress'), cancellable: false },
      async () => {
        await applyDaemonEditSelection({ state, callbacks, editor, instruction });
      }
    );
  } catch (error) {
    state.logger.error('Failed to edit selection through daemon runtime', error);
    reportControllerError({ state, callbacks, error, context: 'Edit Selection' });
  }
}

/** Что это: применяет ответ daemon к выделению; зачем нужно: отделить UI prompt от replacement flow; проблема: editor получает только очищенный code-fence ответ. */
async function applyDaemonEditSelection({
  state,
  callbacks,
  editor,
  instruction
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
  editor: vscode.TextEditor;
  instruction: string;
}): Promise<void> {
  const activeChat = state.chats.getActiveChat();
  await callbacks.ask(activeChat.id, buildEditSelectionPrompt(editor, instruction));
  const refreshedChat = state.chats.getChat(activeChat.id) || activeChat;
  const answer = [...refreshedChat.messages]
    .reverse()
    .find((message) => message.role === 'assistant' && message.content?.trim())?.content;
  if (!answer?.trim()) {
    throw new Error('Daemon did not return an assistant response for Edit Selection.');
  }
  await replaceSelection(editor, stripCodeFence(answer));
  callbacks.sendState();
}
