import * as vscode from 'vscode';

import { t } from '../../shared/i18n';
import { getDefaultModelSettings } from '../config/settingsSnapshot';
import type { AgentControllerCallbacks } from './AgentControllerCallbacks';
import type { AgentControllerState } from './AgentControllerState';

/**
 * Что это: command handler создания нового чата.
 * Зачем нужно: команда VS Code создаёт persisted daemon chat и открывает editor surface.
 * Какую продуктовую проблему решает: пользователь получает новый диалог одним действием.
 */
export async function createChatCommand({
  state,
  callbacks
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
}): Promise<void> {
  state.logger.info('newChat command received');
  const chat = await state.daemonRuntime.createChat(getDefaultModelSettings());
  state.sidebarPage = 'chat';
  state.logger.info('Chat created from command', {
    chatId: chat.id,
    title: chat.title,
    chatCount: state.chats.getSummaries().length
  });
  callbacks.openChatInEditor(chat.id);
  callbacks.sendState();
  vscode.window.setStatusBarMessage(t('status.newChatCreated'), 1800);
}
