import type { ChatStore } from '../../../chats/chatStore';
import type { AistLogger } from '../../../shared/logger';
import type { WebviewSurface } from '../../types';

export type AgentWebviewMessageDeps = {
  chats: ChatStore;
  logger: AistLogger;
  getSidebarPage(): 'chat' | 'settings';
  setSidebarPage(page: 'chat' | 'settings'): void;
  sendState(targetSurface?: WebviewSurface): void;
  postPage(surface: WebviewSurface, page: 'chat' | 'settings'): void;
  refreshModels(): void;
  refreshCodexAuthState(): void;
  ask(chatId: string, prompt: string): Promise<void>;
  compactChat(chatId: string, trigger: 'manual' | 'auto'): Promise<{ id: string }>;
  openChatInEditor(chatId?: string): void;
  retargetDeletedChat(deletedChatId: string, nextChatId: string): void;
  loginCodex(): Promise<void>;
  logoutCodex(): Promise<void>;
  resolveToolCall(messageId: string, approved: boolean): void;
  openWorkspaceFile(path: string, line?: number, column?: number): Promise<void>;
  stopCurrentRun(): void;
};
