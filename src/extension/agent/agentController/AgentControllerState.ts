import type * as vscode from 'vscode';

import type { FileSecretStore } from '../../../core/app/config/config';
import type { CodexAuthSessionProvider } from '../../../core/entities/model/codexAuth';
import type { OpenRouterModelOption } from '../../../core/shared/types/types';
import type { AgentChatStore } from '../../chats/chatDataStore';
import type { AistLogger } from '../../shared/logger';
import type { VscodeDaemonRuntimeBridge } from '../daemon/bridge';
import type { WebviewSurface } from '../types';
import type { ChatVcsService } from '../vcs/chatVcs';

/**
 * Что это: mutable-состояние VS Code контроллера агента.
 * Зачем нужно: сценарные файлы меняют один общий набор surfaces/auth/models/VCS без монолитного класса.
 * Какую продуктовую проблему решает: webview, daemon runtime и VS Code команды не расходятся по источникам правды.
 */
export type AgentControllerState = {
  readonly context: vscode.ExtensionContext;
  readonly chats: AgentChatStore;
  readonly logger: AistLogger;
  readonly daemonRuntime: VscodeDaemonRuntimeBridge;
  readonly editorSurfaces: Map<string, WebviewSurface>;
  readonly secretStore: FileSecretStore;
  readonly codexAuthProvider: CodexAuthSessionProvider;
  readonly chatVcs: ChatVcsService;
  sidebarView: vscode.WebviewView | undefined;
  sidebarChatId: string | undefined;
  sidebarPage: 'chat' | 'settings';
  modelOptions: OpenRouterModelOption[];
  codexAuthenticated: boolean;
  suppressedChatStoreStateBroadcasts: number;
};
