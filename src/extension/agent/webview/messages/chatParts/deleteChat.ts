import * as vscode from 'vscode';

import { t } from '../../../../shared/i18n';
import { getDefaultModelSettings } from '../../../config/settingsSnapshot';
import { type WebviewSurface } from '../../../types';
import { type AgentWebviewMessageDeps } from '../types';

export function deleteChat(surface: WebviewSurface, chatId: string, deps: AgentWebviewMessageDeps): void {
  const chat = deps.chats.getChat(chatId);
  if (!chat) {
    deps.logger.info('Ignoring deleteChat for missing chat', { chatId });
    deps.sendState(surface);
    return;
  }

  if (chat.busy) {
    vscode.window.setStatusBarMessage(t('status.stopBeforeDeleting'), 2400);
    deps.logger.info('Ignoring deleteChat for running chat', { chatId });
    deps.sendState(surface);
    return;
  }

  const nextChat = deps.chats.deleteChat(chatId, getDefaultModelSettings().model);
  deps.retargetDeletedChat(chatId, nextChat.id);
  deps.logger.info('Chat deleted from webview', {
    surfaceId: surface.id,
    deletedChatId: chatId,
    activeChatId: nextChat.id,
    chatCount: deps.chats.getSummaries().length
  });
  deps.sendState();
}
