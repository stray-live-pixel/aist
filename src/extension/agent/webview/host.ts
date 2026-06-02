import * as vscode from 'vscode';

import type { AgentChatStore } from '../../chats/chatDataStore';
import type { AistLogger } from '../../shared/logger';
import { getWebviewHtml } from '../../shared/webviewHtml';
import type { WebviewMessage, WebviewSurface } from '../types';
import { AGENT_CHAT_EDITOR_VIEW_TYPE } from './chatEditorViewType';
import { postWebviewLoading } from './postWebviewLoading';
import { createSidebarSurface } from './surfaces';

export type AgentChatEditorWebviewState = {
  readonly chatId?: string;
};

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
}

/**
 * Открывает чат в editor webview panel.
 *
 * Editor panel имеет собственную привязку к chatId и заголовку, поэтому эта
 * фабрика держит panel-specific детали вне контроллера и возвращает события
 * через явные callbacks.
 */
export function openAgentChatEditor(chatId: string | undefined, deps: AgentWebviewHostDeps): WebviewSurface {
  const requestedChatId = chatId || deps.getSidebarChatId() || deps.chats.getActiveChat().id;
  const chat = deps.chats.getChat(requestedChatId);
  const fallbackChat = deps.chats.getActiveChat();
  const panelChatIdInitial = chat?.id || requestedChatId;
  const title = chat?.title || fallbackChat.title;

  deps.logger.info('Opening chat in editor', { chatId: panelChatIdInitial, requestedChatId });
  const panel = vscode.window.createWebviewPanel(
    AGENT_CHAT_EDITOR_VIEW_TYPE,
    `aist: ${title}`,
    vscode.ViewColumn.Beside,
    getWebviewOptions(deps.context)
  );

  return attachAgentChatEditor(panel, panelChatIdInitial, deps);
}

/**
 * Что это: открывает editor вкладку до создания persisted chat.
 * Зачем нужно: пользователь сразу видит новую вкладку, пока daemon записывает чат в FS.
 * Какую продуктовую проблему решает: действие «Новый чат» ощущается мгновенным даже при медленном daemon/storage.
 */
export function openPendingAgentChatEditor({
  deps,
  title,
  message
}: {
  deps: AgentWebviewHostDeps;
  title: string;
  message: string;
}): WebviewSurface {
  const fallbackChat = deps.chats.getActiveChat();
  const panel = vscode.window.createWebviewPanel(
    AGENT_CHAT_EDITOR_VIEW_TYPE,
    `aist: ${title}`,
    vscode.ViewColumn.Beside,
    getWebviewOptions(deps.context)
  );

  deps.logger.info('Opening pending chat editor', { fallbackChatId: fallbackChat.id });
  return attachAgentChatEditor(panel, fallbackChat.id, deps, { pendingCreationMessage: message });
}

export function deserializeAgentChatEditor(
  panel: vscode.WebviewPanel,
  state: unknown,
  deps: AgentWebviewHostDeps
): void {
  const chatId = getRestoredChatId(state) || deps.getSidebarChatId() || deps.chats.getActiveChat().id;
  const chat = deps.chats.getChat(chatId) || deps.chats.getActiveChat();

  deps.logger.info('Restoring chat editor webview', { chatId: chat.id, title: chat.title });
  panel.title = `aist: ${chat.title}`;
  attachAgentChatEditor(panel, chat.id, deps);
}

export function createSidebar(deps: AgentWebviewHostDeps, webview: vscode.Webview): WebviewSurface {
  return createSidebarSurface({
    webview,
    chats: deps.chats,
    getSidebarChatId: deps.getSidebarChatId,
    setSidebarChatId: deps.setSidebarChatId
  });
}

function attachAgentChatEditor(
  panel: vscode.WebviewPanel,
  initialChatId: string,
  deps: AgentWebviewHostDeps,
  options: { pendingCreationMessage?: string } = {}
): WebviewSurface {
  const surfaceId = `${initialChatId}:${Date.now()}`;
  let panelChatId = initialChatId;
  let pendingCreationMessage = options.pendingCreationMessage;

  const surface: WebviewSurface = {
    id: surfaceId,
    kind: 'editor',
    webview: panel.webview,
    getChatId: () => panelChatId,
    setChatId: (nextChatId) => {
      panelChatId = nextChatId;
      pendingCreationMessage = undefined;
      const nextChat = deps.chats.getChat(nextChatId);
      if (nextChat) {
        panel.title = `aist: ${nextChat.title}`;
      }
    },
    isPendingChatCreation: () => Boolean(pendingCreationMessage),
    getPendingChatCreationMessage: () => pendingCreationMessage || ''
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

  if (pendingCreationMessage) {
    postWebviewLoading({ surface, message: pendingCreationMessage });
  } else {
    deps.sendState(surface);
  }

  return surface;
}

function getWebviewOptions(context: vscode.ExtensionContext): vscode.WebviewPanelOptions & vscode.WebviewOptions {
  return {
    enableScripts: true,
    retainContextWhenHidden: true,
    localResourceRoots: [
      vscode.Uri.joinPath(context.extensionUri, 'dist'),
      vscode.Uri.joinPath(context.extensionUri, 'assets')
    ]
  };
}

function configureWebview(
  webview: vscode.Webview,
  context: vscode.ExtensionContext,
  _retainContextWhenHidden: boolean
): void {
  webview.options = getWebviewOptions(context);
  webview.html = getWebviewHtml(webview, context.extensionUri);
}

function getRestoredChatId(state: unknown): string | undefined {
  const candidate = state as AgentChatEditorWebviewState | undefined;
  return typeof candidate?.chatId === 'string' && candidate.chatId.trim() ? candidate.chatId : undefined;
}
