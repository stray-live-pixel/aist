import type * as vscode from 'vscode';

import type { AgentChatStore } from '../../chats/chatDataStore';
import type { WebviewSurface } from '../types';

/**
 * Создает WebviewSurface для sidebar.
 *
 * Sidebar surface нужен в нескольких местах контроллера, поэтому фабрика держит
 * одинаковую синхронизацию chatId со store в одном месте и убирает копипасту.
 */
export function createSidebarSurface(params: {
  webview: vscode.Webview;
  chats: AgentChatStore;
  getSidebarChatId(): string | undefined;
  setSidebarChatId(chatId: string): void;
}): WebviewSurface {
  return {
    id: 'sidebar',
    kind: 'sidebar',
    webview: params.webview,
    getChatId: () => params.getSidebarChatId() || params.chats.getActiveChat().id,
    setChatId: (nextChatId) => {
      params.setSidebarChatId(nextChatId);
      params.chats.setActiveChat(nextChatId);
    }
  };
}
