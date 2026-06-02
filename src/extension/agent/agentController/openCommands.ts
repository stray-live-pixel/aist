import path from 'node:path';
import * as vscode from 'vscode';

import type { WebviewSurface } from '../types';
import {
  deserializeAgentChatEditor,
  openAgentChatEditor,
  openPendingAgentChatEditor,
  resolveAgentSidebarWebview
} from '../webview/host';
import type { AgentControllerCallbacks } from './AgentControllerCallbacks';
import type { AgentControllerState } from './AgentControllerState';
import { getWebviewHostDeps } from './getWebviewHostDeps';
import { postShowChats } from './postShowChats';
import { postSidebarPage } from './postSidebarPage';

/** Что это: открывает чат в sidebar; зачем нужно: команда фокусирует нужный chat/page; проблема: пользователь быстро возвращается к диалогу. */
export function openChatCommand({
  state,
  callbacks,
  chatId
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
  chatId?: string;
}): void {
  state.logger.info('openChat command received', { chatId: chatId || null });
  state.sidebarPage = 'chat';
  if (chatId) {
    state.sidebarChatId = chatId;
    state.chats.setActiveChat(chatId);
  }
  void vscode.commands.executeCommand('workbench.view.extension.openrouterAgent');
  callbacks.sendState();
  postSidebarPage({ state, callbacks });
}

/** Что это: открывает список чатов; зачем нужно: sidebar получает showChats-сообщение; проблема: пользователь видит историю диалогов. */
export function openChatsCommand({
  state,
  callbacks
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
}): void {
  state.logger.info('openChats command received');
  state.sidebarPage = 'chat';
  void vscode.commands.executeCommand('workbench.view.extension.openrouterAgent');
  callbacks.sendState();
  postSidebarPage({ state, callbacks });
  postShowChats({ state });
}

/** Что это: открывает settings page; зачем нужно: команда переводит sidebar на настройки; проблема: пользователь меняет агентские параметры без поиска страницы. */
export function openSettingsCommand({
  state,
  callbacks
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
}): void {
  state.logger.info('openSettings command received');
  state.sidebarPage = 'settings';
  void vscode.commands.executeCommand('workbench.view.extension.openrouterAgent');
  postSidebarPage({ state, callbacks });
}

/** Что это: открывает папку .aist-agent; зачем нужно: пользователь может посмотреть storage/debug файлы; проблема: диагностика доступна из команды. */
export async function openStorageCommand({ state }: { state: AgentControllerState }): Promise<void> {
  const uri = vscode.Uri.file(path.join(state.daemonRuntime.workspaceRoot, '.aist-agent'));
  state.logger.info('openStorage command received', { path: uri.fsPath });
  await vscode.workspace.fs.createDirectory(uri);
  await vscode.env.openExternal(uri);
}

/** Что это: подключает sidebar webview; зачем нужно: host получает актуальные deps; проблема: sidebar готов принимать state/messages. */
export function resolveWebviewViewCommand({
  state,
  callbacks,
  webviewView
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
  webviewView: vscode.WebviewView;
}): void {
  state.logger.info('resolveWebviewView called', {
    viewType: webviewView.viewType,
    title: webviewView.title,
    visible: webviewView.visible
  });
  resolveAgentSidebarWebview(webviewView, state.sidebarPage, getWebviewHostDeps({ state, callbacks }));
}

/** Что это: открывает chat editor panel; зачем нужно: пользователь может вынести диалог из sidebar; проблема: длинные чаты удобнее читать в редакторе. */
export function openChatInEditorCommand({
  state,
  callbacks,
  chatId
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
  chatId?: string;
}): WebviewSurface {
  return openAgentChatEditor(chatId, getWebviewHostDeps({ state, callbacks }));
}

/**
 * Что это: открывает временную editor вкладку для создаваемого чата.
 * Зачем нужно: вкладка появляется сразу, а persisted chatId привязывается позже после daemon create.
 * Какую продуктовую проблему решает: пользователь получает быстрый визуальный отклик на кнопку «Новый чат».
 */
export function openCreatingChatEditorCommand({
  state,
  callbacks,
  title,
  message
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
  title: string;
  message: string;
}): WebviewSurface {
  return openPendingAgentChatEditor({ deps: getWebviewHostDeps({ state, callbacks }), title, message });
}

/** Что это: восстанавливает chat editor после reload; зачем нужно: VS Code вызывает serializer; проблема: открытые диалоги не теряются при перезагрузке окна. */
export async function deserializeWebviewPanelCommand({
  state,
  callbacks,
  panel,
  panelState
}: {
  state: AgentControllerState;
  callbacks: AgentControllerCallbacks;
  panel: vscode.WebviewPanel;
  panelState: unknown;
}): Promise<void> {
  deserializeAgentChatEditor(panel, panelState, getWebviewHostDeps({ state, callbacks }));
}
