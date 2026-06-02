import * as vscode from 'vscode';

import { type WebviewSurface } from '../../../types';
import { type AgentWebviewMessageDeps } from '../types';
import { buildChatJsonExport } from './buildChatJsonExport';

export async function openChatJson(
  surface: WebviewSurface,
  chatId: string,
  deps: AgentWebviewMessageDeps
): Promise<void> {
  const chat = deps.chats.getChat(chatId);
  if (!chat) {
    deps.logger.info('Ignoring openChatJson for missing chat', { chatId });
    deps.sendState(surface);
    return;
  }

  const exportPayload = buildChatJsonExport(chat, surface);
  const document = await vscode.workspace.openTextDocument({
    language: 'json',
    content: `${JSON.stringify(exportPayload, null, 2)}\n`
  });
  await vscode.window.showTextDocument(document, { preview: false });
  deps.logger.info('Chat JSON opened in editor', {
    chatId,
    messageCount: chat.messages.length,
    nextRequestMessageCount: exportPayload.nextPromptContext.messagesSentToModel.length
  });
}
