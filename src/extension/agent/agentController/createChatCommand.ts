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
  vscode.window.setStatusBarMessage(t('status.creatingChat'), 1800);
  const surface = callbacks.openCreatingChatEditor({
    title: t('status.creatingChatTitle'),
    message: t('status.creatingChatMessage')
  });
  const chat = await state.daemonRuntime.createChat(getDefaultModelSettings());
  state.sidebarPage = 'chat';
  surface.setChatId(chat.id);
  state.logger.info('Chat created from command', {
    chatId: chat.id,
    title: chat.title,
    chatCount: state.chats.getSummaries().length
  });
  callbacks.sendState(surface);
  callbacks.sendState();
  vscode.window.setStatusBarMessage(t('status.newChatCreated'), 1800);
}
