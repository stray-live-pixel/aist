import * as vscode from 'vscode';

import type { ChatStore } from '../../chats/chatStore';
import type { OpenRouterMessage, OpenRouterTool } from '../../openrouter/types';
import { replaceSelection, stripCodeFence } from '../context/editorContext';
import { buildEditSelectionPrompt } from './editSelectionPrompt';

export type EditSelectionDeps = {
  chats: ChatStore;
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
    vscode.window.showWarningMessage('Open a file first.');
    return;
  }

  const instruction = await askEditInstruction();
  if (!instruction) {
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'aist is editing...',
      cancellable: false
    },
    async () => applyEdit(editor, instruction, deps)
  );
}

async function askEditInstruction(): Promise<string | undefined> {
  return vscode.window.showInputBox({
    title: 'aist: Edit Selection',
    prompt: 'Describe what should be generated or changed',
    placeHolder: 'Example: refactor this function and add error handling'
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
