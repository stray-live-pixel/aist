import * as vscode from 'vscode';

import type { OpenRouterMessage, OpenRouterTool } from '../../../core/types';
import type { AgentChatStore } from '../../chats/chatDataStore';
import { t } from '../../shared/i18n';
import { replaceSelection, stripCodeFence } from '../context/editorContext';
import { buildEditSelectionPrompt } from './editSelectionPrompt';

export type EditSelectionDeps = {
  chats: AgentChatStore;
  getSystemPrompt(): string;
  chat(
    messages: OpenRouterMessage[],
    tools?: OpenRouterTool[],
    modelOverride?: string,
    signal?: AbortSignal
  ): Promise<OpenRouterMessage>;
};

/**
 * Выполняет VS Code команду «Edit Selection».
 *
 * Команда состоит из UI workflow: взять активный редактор, спросить инструкцию,
 * вызвать модель и заменить выделение. Prompt вынесен отдельно, а контроллер
 * передает только зависимости для доступа к чату и transport-методу модели.
 */
export async function editSelection(deps: EditSelectionDeps): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage(t('editSelection.openFileFirst'));
    return;
  }

  const instruction = await askEditInstruction();
  if (!instruction) {
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: t('editSelection.progress'),
      cancellable: false
    },
    async () => applyEdit(editor, instruction, deps)
  );
}

async function askEditInstruction(): Promise<string | undefined> {
  return vscode.window.showInputBox({
    title: t('editSelection.title'),
    prompt: t('editSelection.prompt'),
    placeHolder: t('editSelection.placeholder')
  });
}

async function applyEdit(editor: vscode.TextEditor, instruction: string, deps: EditSelectionDeps): Promise<void> {
  const activeChat = deps.chats.getActiveChat();
  const prompt = buildEditSelectionPrompt(editor, instruction);
  const answer = await deps.chat(
    [
      { role: 'system', content: deps.getSystemPrompt() },
      { role: 'user', content: prompt }
    ],
    undefined,
    activeChat.model
  );

  await replaceSelection(editor, stripCodeFence(answer.content || ''));
  deps.chats.setLastAnswer(activeChat.id, answer.content || '');
}
