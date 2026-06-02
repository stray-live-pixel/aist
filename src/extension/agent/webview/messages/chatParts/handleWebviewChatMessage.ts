import * as vscode from 'vscode';

import { t } from '../../../../shared/i18n';
import { getDefaultModelSettings } from '../../../config/settingsSnapshot';
import { type WebviewSurface } from '../../../types';
import { type AgentWebviewMessageDeps } from '../types';
import { ChatMessage } from './ChatMessage';
import { clearChat } from './clearChat';
import { compactChat } from './compactChat';
import { createChatFromWebview } from './createChatFromWebview';
import { deleteChat } from './deleteChat';
import { duplicateChat } from './duplicateChat';
import { openChatJson } from './openChatJson';
import { setActiveChat } from './setActiveChat';
import { setChatModelSettings } from './setChatModelSettings';
import { setModel } from './setModel';

export async function handleWebviewChatMessage(
  surface: WebviewSurface,
  message: ChatMessage,
  deps: AgentWebviewMessageDeps
): Promise<void> {
  switch (message.type) {
    case 'ask':
      await deps.ask(surface.getChatId(), message.prompt);
      return;
    case 'newChat':
      createChatFromWebview(surface, deps);
      return;
    case 'duplicateChat':
      duplicateChat(surface, message.chatId, deps);
      return;
    case 'deleteChat':
      deleteChat(surface, message.chatId, deps);
      return;
    case 'setActiveChat':
      setActiveChat(surface, message.chatId, deps);
      return;
    case 'openChatInEditor':
      deps.openChatInEditor(message.chatId || surface.getChatId());
      return;
    case 'openChatJson':
      await openChatJson(surface, message.chatId || surface.getChatId(), deps);
      return;
    case 'compactChat':
      await compactChat(surface, message.chatId || surface.getChatId(), deps);
      return;
    case 'setModel':
      await setModel(surface, message.model, deps);
      return;
    case 'setChatModelSettings':
      setChatModelSettings(surface, message.settings, deps);
      return;
    case 'resetChatModelSettings':
      setChatModelSettings(surface, getDefaultModelSettings(), deps);
      return;
    case 'clear':
      clearChat(surface, deps);
      return;
    case 'copyMessage':
      await vscode.env.clipboard.writeText(message.markdown || '');
      vscode.window.setStatusBarMessage(t('status.copiedMarkdown'), 1800);
      return;
  }
}
