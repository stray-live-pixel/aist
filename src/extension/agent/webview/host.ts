import * as vscode from 'vscode';

import type { AgentChatStore } from '../../chats/chatDataStore';
import type { AistLogger } from '../../shared/logger';
import { getWebviewHtml } from '../../shared/webviewHtml';
import type { WebviewMessage, WebviewSurface } from '../types';
import { createSidebarSurface } from './surfaces';

export type AgentWebviewHostDeps = {
  context: vscode.ExtensionContext;
  chats: AgentChatStore;
  logger: AistLogger;
  getSidebarChatId(): string | undefined;
  setSidebarChatId(chatId: string): void;
  setSidebarView(view: vscode.WebviewView | undefined): void;
  registerEditorSurface(surfaceId: string, surface: WebviewSurface): void;
  unregisterEditorSurface(surfaceId: string): void;
  handleMessage(surface: WebviewSurface, message: WebviewMessage): void;
  sendState(surface: WebviewSurface): void;
  postPage(surface: WebviewSurface, page: 'chat' | 'settings'): void;
  refreshModels(): void;
};

/**
 * Настраивает sidebar webview и возвращает его surface-адаптер.
 *
 * Модуль инкапсулирует VS Code webview boilerplate: options, html, dispose и
 * подписку на сообщения. AgentController остается владельцем состояния, но не
 * хранит низкоуровневый код инициализации webview.
 */
export function resolveAgentSidebarWebview(
  webviewView: vscode.WebviewView,
  page: 'chat' | 'settings',
  deps: AgentWebviewHostDeps
): void {
  deps.setSidebarView(webviewView);
  deps.setSidebarChatId(deps.getSidebarChatId() || deps.chats.getActiveChat().id);
  configureWebview(webviewView.webview, deps.context, false);
  webviewView.onDidDispose(() => {
    deps.logger.info('Sidebar webview disposed');
    deps.setSidebarView(undefined);
  });

  const surface = createSidebar(deps, webviewView.webview);
  webviewView.webview.onDidReceiveMessage((message: WebviewMessage) => {
    deps.logger.info('Sidebar webview message received', { type: message.type });
    deps.handleMessage(surface, message);
  });

  deps.sendState(surface);
  deps.postPage(surface, page);
  deps.refreshModels();
}

/**
 * Открывает чат в editor webview panel.
 *
 * Editor panel имеет собственную привязку к chatId и заголовку, поэтому эта
 * фабрика держит panel-specific детали вне контроллера и возвращает события
 * через явные callbacks.
 */
export function openAgentChatEditor(chatId: string | undefined, deps: AgentWebviewHostDeps): void {
  const requestedChatId = chatId || deps.getSidebarChatId() || deps.chats.getActiveChat().id;
  const chat = deps.chats.getChat(requestedChatId);
  const fallbackChat = deps.chats.getActiveChat();
  const panelChatIdInitial = chat?.id || requestedChatId;
  const surfaceId = `${panelChatIdInitial}:${Date.now()}`;
  let panelChatId = panelChatIdInitial;
  const title = chat?.title || fallbackChat.title;

  deps.logger.info('Opening chat in editor', { chatId: panelChatId, requestedChatId, surfaceId });
  const panel = vscode.window.createWebviewPanel('openrouterAgentChat', `aist: ${title}`, vscode.ViewColumn.Beside, {
    enableScripts: true,
    retainContextWhenHidden: true,
    localResourceRoots: [
      vscode.Uri.joinPath(deps.context.extensionUri, 'dist'),
      vscode.Uri.joinPath(deps.context.extensionUri, 'assets')
    ]
  });

  const surface: WebviewSurface = {
    id: surfaceId,
    kind: 'editor',
    webview: panel.webview,
    getChatId: () => panelChatId,
    setChatId: (nextChatId) => {
      panelChatId = nextChatId;
      const nextChat = deps.chats.getChat(nextChatId);
      if (nextChat) {
        panel.title = `aist: ${nextChat.title}`;
      }
    }
  };

  deps.registerEditorSurface(surfaceId, surface);
  configureWebview(panel.webview, deps.context, true);
  panel.onDidDispose(() => {
    deps.logger.info('Editor webview disposed', { surfaceId, chatId: panelChatId });
    deps.unregisterEditorSurface(surfaceId);
  });
  panel.webview.onDidReceiveMessage((message: WebviewMessage) => {
    deps.logger.info('Editor webview message received', { surfaceId, type: message.type });
    deps.handleMessage(surface, message);
  });

  deps.sendState(surface);
  deps.refreshModels();
}

export function createSidebar(deps: AgentWebviewHostDeps, webview: vscode.Webview): WebviewSurface {
  return createSidebarSurface({
    webview,
    chats: deps.chats,
    getSidebarChatId: deps.getSidebarChatId,
    setSidebarChatId: deps.setSidebarChatId
  });
}

function configureWebview(
  webview: vscode.Webview,
  context: vscode.ExtensionContext,
  _retainContextWhenHidden: boolean
): void {
  webview.options = {
    enableScripts: true,
    localResourceRoots: [
      vscode.Uri.joinPath(context.extensionUri, 'dist'),
      vscode.Uri.joinPath(context.extensionUri, 'assets')
    ]
  };
  webview.html = getWebviewHtml(webview, context.extensionUri);
}
