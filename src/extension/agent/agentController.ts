import * as vscode from 'vscode';

import type { DaemonEvent } from '../../cli/daemonProtocol';
import { initializeTelemetryStore } from '../../core/features/telemetry/telemetry';
import type { ToolApprovalDecision } from '../../core/shared/types/types';
import type { AgentChatStore } from '../chats/chatDataStore';
import type { AistLogger } from '../shared/logger';
import type { AgentControllerCallbacks } from './agentController/AgentControllerCallbacks';
import type { AgentControllerState } from './agentController/AgentControllerState';
import { loginCodex, logoutCodex, refreshCodexAuthState } from './agentController/codexAuthActions';
import { createAgentControllerState } from './agentController/createAgentControllerState';
import { createChatCommand } from './agentController/createChatCommand';
import { editSelectionCommand } from './agentController/editSelectionActions';
import { handleChatStoreChange } from './agentController/handleChatStoreChange';
import {
  deserializeWebviewPanelCommand,
  openChatCommand,
  openChatInEditorCommand,
  openChatsCommand,
  openCreatingChatEditorCommand,
  openIsolationCommand,
  openSettingsCommand,
  openStorageCommand,
  resolveWebviewViewCommand
} from './agentController/openCommands';
import { openWorkspaceFileAction } from './agentController/openWorkspaceFileAction';
import { postChatPatch } from './agentController/postChatPatch';
import { refreshControllerModels } from './agentController/refreshControllerModels';
import { refreshToolCatalogAction } from './agentController/refreshToolCatalogAction';
import { reportControllerError } from './agentController/reportControllerError';
import { reserveChatPatchStateBroadcast } from './agentController/reserveChatPatchStateBroadcast';
import { retargetDeletedChat } from './agentController/retargetDeletedChat';
import { sendControllerState } from './agentController/sendControllerState';
import { syncLegacyOpenRouterApiKey } from './agentController/syncLegacyOpenRouterApiKey';
import {
  commitAndForcePushChatVcs,
  isolateChatVcs,
  mergeChatVcsToMain,
  refreshActiveChatVcs,
  refreshChatVcs
} from './agentController/vcsActions';
import { handleWebviewMessage } from './agentController/webviewMessageActions';
import { initializeAgentConfigStore } from './config/agentConfigStore';
import type { VscodeDaemonRuntimeBridge } from './daemon/bridge';
import type { WebviewMessage, WebviewSurface } from './types';
import { AGENT_CHAT_EDITOR_VIEW_TYPE } from './webview/chatEditorViewType';
import { postWebviewPage } from './webview/page';

/**
 * Что это: VS Code controller для AIST agent UI в daemon-only runtime.
 * Зачем нужно: класс сохраняет публичный API extension-команд, а продуктовые сценарии вынесены в маленькие файлы.
 * Какую продуктовую проблему решает: sidebar/editor webviews управляют daemon-чатыном без монолитного controller-кода.
 */
export class AgentController {
  private readonly state: AgentControllerState;
  private readonly callbacks: AgentControllerCallbacks;

  /** Создаёт controller, инициализирует config/telemetry и подписывает webview на daemon/chat updates. */
  constructor(
    context: vscode.ExtensionContext,
    chats: AgentChatStore,
    logger: AistLogger,
    daemonRuntime: VscodeDaemonRuntimeBridge
  ) {
    initializeAgentConfigStore(context);
    initializeTelemetryStore({ fallbackRoot: context.globalStorageUri.fsPath });
    this.state = createAgentControllerState({ context, chats, logger, daemonRuntime });
    this.callbacks = this.createCallbacks();
    context.subscriptions.push(
      chats.onDidChange(() => handleChatStoreChange({ state: this.state, callbacks: this.callbacks }))
    );
    context.subscriptions.push({
      dispose: daemonRuntime.onBeforeStoreRefresh((event) => this.reserveChatPatch(event))
    });
    context.subscriptions.push({ dispose: daemonRuntime.onEvent((event) => this.postChatPatch(event)) });
    void syncLegacyOpenRouterApiKey({ state: this.state }).catch((error) =>
      logger.error('Failed to sync legacy VS Code OpenRouter API key setting', error)
    );
    void refreshToolCatalogAction({ state: this.state });
    void refreshActiveChatVcs({ state: this.state, callbacks: this.callbacks });
    void refreshCodexAuthState({ state: this.state, callbacks: this.callbacks });
    logger.info('AgentController initialized', {
      activeChatId: chats.getActiveChat().id,
      chatCount: chats.getSummaries().length,
      runtimeMode: 'daemon'
    });
  }

  /** Открывает sidebar на странице конкретного чата. */
  openChat(chatId?: string): void {
    openChatCommand({ state: this.state, callbacks: this.callbacks, chatId });
  }

  /** Открывает sidebar и показывает список чатов. */
  openChats(): void {
    openChatsCommand({ state: this.state, callbacks: this.callbacks });
  }

  /** Открывает страницу настроек агента. */
  openSettings(): void {
    openSettingsCommand({ state: this.state, callbacks: this.callbacks });
  }

  /** Открывает модалку изолированных агентов из системного меню. */
  openIsolation(): void {
    openIsolationCommand({ state: this.state, callbacks: this.callbacks });
  }

  /** Открывает storage-директорию workspace. */
  openStorage(): Promise<void> {
    return openStorageCommand({ state: this.state });
  }

  /** Подключает sidebar webview view к host lifecycle. */
  resolveWebviewView(webviewView: vscode.WebviewView): void {
    resolveWebviewViewCommand({ state: this.state, callbacks: this.callbacks, webviewView });
  }

  /** Открывает чат в editor webview panel. */
  openChatInEditor(chatId?: string): WebviewSurface {
    return openChatInEditorCommand({ state: this.state, callbacks: this.callbacks, chatId });
  }

  /** Восстанавливает editor webview panel после reload. */
  deserializeWebviewPanel(panel: vscode.WebviewPanel, state: unknown): Promise<void> {
    return deserializeWebviewPanelCommand({ state: this.state, callbacks: this.callbacks, panel, panelState: state });
  }

  /** Возвращает VS Code viewType chat editor. */
  get chatEditorViewType(): string {
    return AGENT_CHAT_EDITOR_VIEW_TYPE;
  }

  /** Создаёт новый persisted daemon chat из команды VS Code. */
  createChat(): Promise<void> {
    return createChatCommand({ state: this.state, callbacks: this.callbacks });
  }

  /** Запускает Edit Selection через daemon runtime. */
  editSelection(): Promise<void> {
    return editSelectionCommand({ state: this.state, callbacks: this.callbacks });
  }

  /** Показывает ошибку на webview surfaces и обновляет state. */
  reportError(error: unknown, options: { context?: string } = {}): void {
    reportControllerError({ state: this.state, callbacks: this.callbacks, error, context: options.context });
  }

  /** Логинит Codex auth и обновляет webview state. */
  loginCodex(): Promise<void> {
    return loginCodex({ state: this.state, callbacks: this.callbacks });
  }

  /** Разлогинивает Codex auth и обновляет webview state. */
  logoutCodex(): Promise<void> {
    return logoutCodex({ state: this.state, callbacks: this.callbacks });
  }

  /** Собирает callbacks, которые action-файлы передают host/webview handlers. */
  private createCallbacks(): AgentControllerCallbacks {
    return {
      handleWebviewMessage: (surface, message) => void this.handleWebviewMessage(surface, message),
      sendState: (surface) => this.sendState(surface),
      postPage: (surface, page) => postWebviewPage(surface, page, this.state.logger),
      refreshModels: (force, provider) =>
        void refreshControllerModels({ state: this.state, callbacks: this.callbacks, force, provider }),
      ask: (chatId, prompt, options) => this.ask(chatId, prompt, options),
      openChatInEditor: (chatId) => this.openChatInEditor(chatId),
      openCreatingChatEditor: ({ title, message }) =>
        openCreatingChatEditorCommand({ state: this.state, callbacks: this.callbacks, title, message }),
      retargetDeletedChat: (deletedChatId, nextChatId) =>
        retargetDeletedChat({ state: this.state, deletedChatId, nextChatId }),
      loginCodex: () => this.loginCodex(),
      logoutCodex: () => this.logoutCodex(),
      openWorkspaceFile: (filePath, line, column, endLine, endColumn) =>
        openWorkspaceFileAction({ state: this.state, filePath, line, column, endLine, endColumn }),
      refreshChatVcs: (chatId) => refreshChatVcs({ state: this.state, callbacks: this.callbacks, chatId }),
      isolateChatVcs: (chatId) => isolateChatVcs({ state: this.state, callbacks: this.callbacks, chatId }),
      commitAndForcePushChatVcs: (chatId) =>
        commitAndForcePushChatVcs({ state: this.state, callbacks: this.callbacks, chatId }),
      mergeChatVcsToMain: (chatId) => mergeChatVcsToMain({ state: this.state, callbacks: this.callbacks, chatId }),
      resolveToolCall: (messageId, decision: ToolApprovalDecision) =>
        this.state.daemonRuntime.resolveToolCall(messageId, decision)
    };
  }

  /** Отправляет prompt в daemon runtime после legacy secret sync. */
  private async ask(
    chatId: string,
    prompt: string,
    options: { skipUserMessage?: boolean; attachments?: import('../../core/shared/types/types').AgentAttachment[] } = {}
  ): Promise<void> {
    await syncLegacyOpenRouterApiKey({ state: this.state });
    await this.state.daemonRuntime.ask(chatId, prompt, options);
  }

  /** Обрабатывает webview message через вынесенный dispatcher. */
  private handleWebviewMessage(surface: WebviewSurface, message: WebviewMessage): Promise<void> {
    return handleWebviewMessage({ state: this.state, callbacks: this.callbacks, surface, message });
  }

  /** Отправляет полный state в одну или все webview surfaces. */
  private sendState(surface?: WebviewSurface): void {
    sendControllerState({ state: this.state, callbacks: this.callbacks, targetSurface: surface });
  }

  /** Заранее подавляет ближайший full state, если daemon event будет представлен chat.patch. */
  private reserveChatPatch(event: DaemonEvent): void {
    reserveChatPatchStateBroadcast({ state: this.state, event });
  }

  /** Отправляет incremental chat patch по daemon event. */
  private postChatPatch(event: DaemonEvent): void {
    postChatPatch({ state: this.state, callbacks: this.callbacks, event });
  }
}
