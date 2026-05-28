import path from 'node:path';
import * as vscode from 'vscode';

import { CodexAuthSessionProvider } from '../../core/codexAuth';
import { FileSecretStore, OPENROUTER_API_KEY_SECRET_KEY } from '../../core/config';
import { FALLBACK_MODEL_OPTIONS } from '../../core/modelDefaults';
import { initializeTelemetryStore } from '../../core/telemetry';
import type { OpenRouterModelOption, ToolApprovalDecision } from '../../core/types';
import type { AgentChatStore } from '../chats/chatDataStore';
import { VscodeCodexLoginAdapter } from '../codex/vscodeLogin';
import { getErrorMessage } from '../shared/errors';
import { t } from '../shared/i18n';
import type { AistLogger } from '../shared/logger';
import { getAgentSkills } from '../skills/skills';
import { getDisabledProjectToolIds } from '../tools/permissions';
import { buildEditSelectionPrompt } from './commands/editSelectionPrompt';
import { openWorkspaceFile as openWorkspaceFileFromWebview } from './commands/openWorkspaceFile';
import { initializeAgentConfigStore } from './config/agentConfigStore';
import { getConfiguredModel } from './config/settingsSnapshot';
import { buildAgentSystemPrompt } from './config/systemPrompt';
import { replaceSelection, stripCodeFence } from './context/editorContext';
import type { VscodeDaemonRuntimeBridge } from './daemon/bridge';
import { refreshDaemonToolCatalog } from './daemon/toolCatalog';
import type { WebviewMessage, WebviewSurface } from './types';
import { createSidebar, openAgentChatEditor, resolveAgentSidebarWebview } from './webview/host';
import { handleAgentWebviewMessage } from './webview/messages';
import { postWebviewPage } from './webview/page';
import { sendAgentState } from './webview/statePresenter';

/**
 * Thin VS Code client controller.
 *
 * The CLI daemon is the only chat/runtime backend. This controller owns VS Code
 * surfaces and small host adapters, then forwards chat/run actions over the
 * daemon bridge.
 */
export class AgentController {
  private sidebarView: vscode.WebviewView | undefined;
  private sidebarChatId: string | undefined;
  private sidebarPage: 'chat' | 'settings' = 'chat';
  private readonly editorSurfaces = new Map<string, WebviewSurface>();
  private readonly secretStore: FileSecretStore;
  private readonly codexAuthProvider: CodexAuthSessionProvider;
  private modelOptions: OpenRouterModelOption[] = [...FALLBACK_MODEL_OPTIONS];
  private codexAuthenticated = false;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly chats: AgentChatStore,
    private readonly logger: AistLogger,
    private readonly daemonRuntime: VscodeDaemonRuntimeBridge
  ) {
    initializeAgentConfigStore(context);
    initializeTelemetryStore({
      workspaceRoot: daemonRuntime.workspaceRoot,
      fallbackRoot: (context.storageUri || context.globalStorageUri).fsPath
    });
    this.secretStore = new FileSecretStore({
      logger: { warn: (message, details) => this.logger.info(message, details) }
    });
    this.codexAuthProvider = new CodexAuthSessionProvider(this.secretStore, { logger });

    void this.syncLegacyOpenRouterApiKey().catch((error) =>
      this.logger.error('Failed to sync legacy VS Code OpenRouter API key setting', error)
    );
    void this.refreshToolCatalog();
    void this.refreshCodexAuthState();
    void this.refreshModels();
    this.logger.info('AgentController initialized', {
      activeChatId: this.chats.getActiveChat().id,
      chatCount: this.chats.getSummaries().length,
      runtimeMode: 'daemon'
    });
  }

  openChat(chatId?: string): void {
    this.logger.info('openChat command received', { chatId: chatId || null });
    this.sidebarPage = 'chat';

    if (chatId) {
      this.sidebarChatId = chatId;
      this.chats.setActiveChat(chatId);
    }

    void vscode.commands.executeCommand('workbench.view.extension.openrouterAgent');
    this.sendState();
    this.postSidebarPage();
  }

  openChats(): void {
    this.logger.info('openChats command received');
    this.sidebarPage = 'chat';
    void vscode.commands.executeCommand('workbench.view.extension.openrouterAgent');
    this.sendState();
    this.postSidebarPage();
    this.postShowChats();
  }

  openSettings(): void {
    this.logger.info('openSettings command received');
    this.sidebarPage = 'settings';
    void vscode.commands.executeCommand('workbench.view.extension.openrouterAgent');
    this.postSidebarPage();
  }

  async openStorage(): Promise<void> {
    const uri = vscode.Uri.file(path.join(this.daemonRuntime.workspaceRoot, '.aist-agent'));
    this.logger.info('openStorage command received', { path: uri.fsPath });

    await vscode.workspace.fs.createDirectory(uri);
    await vscode.env.openExternal(uri);
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.logger.info('resolveWebviewView called', {
      viewType: webviewView.viewType,
      title: webviewView.title,
      visible: webviewView.visible
    });

    resolveAgentSidebarWebview(webviewView, this.sidebarPage, this.getWebviewHostDeps());
  }

  openChatInEditor(chatId?: string): void {
    openAgentChatEditor(chatId, this.getWebviewHostDeps());
  }

  private getSurfaces(): WebviewSurface[] {
    const surfaces: WebviewSurface[] = [...this.editorSurfaces.values()];
    if (this.sidebarView) {
      surfaces.push(this.createSidebarSurface(this.sidebarView.webview));
    }

    return surfaces;
  }

  private createSidebarSurface(webview: vscode.Webview): WebviewSurface {
    return createSidebar(this.getWebviewHostDeps(), webview);
  }

  private getWebviewHostDeps() {
    return {
      context: this.context,
      chats: this.chats,
      logger: this.logger,
      getSidebarChatId: () => this.sidebarChatId,
      setSidebarChatId: (chatId: string) => {
        this.sidebarChatId = chatId;
      },
      setSidebarView: (view: vscode.WebviewView | undefined) => {
        this.sidebarView = view;
      },
      registerEditorSurface: (surfaceId: string, surface: WebviewSurface) => {
        this.editorSurfaces.set(surfaceId, surface);
      },
      unregisterEditorSurface: (surfaceId: string) => {
        this.editorSurfaces.delete(surfaceId);
      },
      handleMessage: (surface: WebviewSurface, message: WebviewMessage) => {
        void this.handleWebviewMessage(surface, message);
      },
      sendState: (surface: WebviewSurface) => this.sendState(surface),
      postPage: (surface: WebviewSurface, page: 'chat' | 'settings') => this.postPage(surface, page),
      refreshModels: () => {
        void this.refreshModels();
      }
    };
  }

  async createChat(): Promise<void> {
    this.logger.info('newChat command received');

    const chat = await this.daemonRuntime.createChat(getConfiguredModel());
    this.sidebarChatId = chat.id;
    this.sidebarPage = 'chat';

    this.logger.info('Chat created from command', {
      chatId: chat.id,
      title: chat.title,
      chatCount: this.chats.getSummaries().length,
      surfaces: this.getSurfaces().map((surface) => surface.id)
    });

    void vscode.commands.executeCommand('workbench.view.extension.openrouterAgent');
    this.sendState();
    this.postSidebarPage();
    vscode.window.setStatusBarMessage(t('status.newChatCreated'), 1800);
  }

  async editSelection(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage(t('editSelection.openFileFirst'));
      return;
    }

    const instruction = await vscode.window.showInputBox({
      title: t('editSelection.title'),
      prompt: t('editSelection.prompt'),
      placeHolder: t('editSelection.placeholder')
    });
    if (!instruction) {
      return;
    }

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: t('editSelection.progress'),
          cancellable: false
        },
        async () => this.applyDaemonEditSelection(editor, instruction)
      );
    } catch (error) {
      this.logger.error('Failed to edit selection through daemon runtime', error);
      this.reportError(error, { context: 'Edit Selection' });
    }
  }

  private async ask(chatId: string, prompt: string): Promise<void> {
    await this.syncLegacyOpenRouterApiKey();
    await this.daemonRuntime.ask(chatId, prompt);
    this.sendState();
  }

  private async applyDaemonEditSelection(editor: vscode.TextEditor, instruction: string): Promise<void> {
    const activeChat = this.chats.getActiveChat();
    const prompt = buildEditSelectionPrompt(editor, instruction);

    await this.ask(activeChat.id, prompt);

    const refreshedChat = this.chats.getChat(activeChat.id) || activeChat;
    const answer = [...refreshedChat.messages]
      .reverse()
      .find((message) => message.role === 'assistant' && message.content?.trim())?.content;

    if (!answer?.trim()) {
      throw new Error('Daemon did not return an assistant response for Edit Selection.');
    }

    await replaceSelection(editor, stripCodeFence(answer));
    this.sendState();
  }

  private async handleWebviewMessage(surface: WebviewSurface, message: WebviewMessage): Promise<void> {
    try {
      await this.handleWebviewMessageUnsafe(surface, message);
    } catch (error) {
      await this.daemonRuntime
        .stop()
        .catch((stopError) => this.logger.error('Failed to stop daemon run after webview error', stopError));
      this.reportError(error, { context: `webview command: ${message.type}` });
      this.logger.error('Unhandled webview message error', error);
      this.sendState(surface);
    }
  }

  private async handleWebviewMessageUnsafe(surface: WebviewSurface, message: WebviewMessage): Promise<void> {
    if (await this.handleDaemonWebviewMessage(surface, message)) {
      return;
    }

    await handleAgentWebviewMessage(surface, message, {
      chats: this.chats,
      logger: this.logger,
      getSidebarPage: () => this.sidebarPage,
      setSidebarPage: (page) => {
        this.sidebarPage = page;
      },
      sendState: (targetSurface) => this.sendState(targetSurface),
      postPage: (targetSurface, page) => this.postPage(targetSurface, page),
      refreshModels: () => {
        void this.refreshModels();
      },
      refreshCodexAuthState: () => {
        void this.refreshCodexAuthState();
      },
      ask: (chatId, prompt) => this.ask(chatId, prompt),
      compactChat: (chatId, trigger) => this.daemonRuntime.compactChat(chatId, trigger),
      openChatInEditor: (chatId) => this.openChatInEditor(chatId),
      retargetDeletedChat: (deletedChatId, nextChatId) => this.retargetDeletedChat(deletedChatId, nextChatId),
      loginCodex: () => this.loginCodex(),
      logoutCodex: () => this.logoutCodex(),
      resolveToolCall: (messageId, decision) => this.daemonRuntime.resolveToolCall(messageId, decision),
      openWorkspaceFile: (filePath, line, column, endLine, endColumn) =>
        this.openWorkspaceFile(filePath, line, column, endLine, endColumn),
      stopCurrentRun: () => this.daemonRuntime.stop().then(() => this.sendState())
    });
  }

  private async handleDaemonWebviewMessage(surface: WebviewSurface, message: WebviewMessage): Promise<boolean> {
    switch (message.type) {
      case 'ask':
        await this.ask(surface.getChatId(), message.prompt);
        return true;
      case 'newChat': {
        const chat = await this.daemonRuntime.createChat(getConfiguredModel());
        surface.setChatId(chat.id);
        this.sidebarPage = 'chat';
        this.sendState();
        if (surface.kind === 'sidebar') {
          this.postPage(surface, 'chat');
        }
        return true;
      }
      case 'deleteChat': {
        const nextChat = await this.daemonRuntime.deleteChat(message.chatId, getConfiguredModel());
        this.retargetDeletedChat(message.chatId, nextChat.id);
        this.sendState();
        return true;
      }
      case 'setModel': {
        const chat = this.chats.getChat(surface.getChatId()) || this.chats.getActiveChat();
        await this.daemonRuntime.setModel(chat.id, message.model);
        await vscode.workspace
          .getConfiguration('openrouterAgent')
          .update('model', message.model, vscode.ConfigurationTarget.Workspace);
        this.sendState();
        return true;
      }
      case 'clear': {
        const chat = this.chats.getChat(surface.getChatId()) || this.chats.getActiveChat();
        await this.daemonRuntime.clearChat(chat.id);
        this.sendState(surface);
        return true;
      }
      case 'compactChat': {
        const chatId = message.chatId || surface.getChatId();
        const chat = await this.daemonRuntime.compactChat(chatId, 'manual');
        surface.setChatId(chat.id);
        this.sendState();
        return true;
      }
      case 'resolveToolCall':
        await this.daemonRuntime.resolveToolCall(message.messageId, toToolApprovalDecision(message));
        return true;
      case 'stop':
        await this.daemonRuntime.stop();
        this.sendState();
        return true;
      case 'duplicateChat':
        vscode.window.setStatusBarMessage('Duplicate chat is not available in AIST daemon-only mode yet.', 2400);
        this.sendState(surface);
        return true;
      default:
        return false;
    }
  }

  private async openWorkspaceFile(
    filePath: string,
    line?: number,
    column?: number,
    endLine?: number,
    endColumn?: number
  ): Promise<void> {
    await openWorkspaceFileFromWebview({ filePath, line, column, endLine, endColumn, logger: this.logger });
  }

  reportError(error: unknown, options: { context?: string } = {}): void {
    this.postErrorModal(formatChatErrorMessage(error, options.context));
    this.sendState();
  }

  private postErrorModal(message: string): void {
    for (const surface of this.getSurfaces()) {
      void surface.webview.postMessage({ type: 'errorModal', message }).then(
        (delivered) => {
          this.logger.info('Error modal posted to webview', {
            surfaceId: surface.id,
            kind: surface.kind,
            delivered
          });
        },
        (error) => {
          this.logger.error('Failed to post error modal to webview', error);
        }
      );
    }
  }

  private retargetDeletedChat(deletedChatId: string, nextChatId: string): void {
    if (this.sidebarChatId === deletedChatId) {
      this.sidebarChatId = nextChatId;
    }

    for (const surface of this.editorSurfaces.values()) {
      if (surface.getChatId() === deletedChatId) {
        surface.setChatId(nextChatId);
      }
    }
  }

  private postSidebarPage(): void {
    if (!this.sidebarView) {
      return;
    }

    this.postPage(this.createSidebarSurface(this.sidebarView.webview), this.sidebarPage);
  }

  private postShowChats(): void {
    if (!this.sidebarView) {
      return;
    }

    void this.sidebarView.webview.postMessage({ type: 'showChats' }).then(
      (delivered) => {
        this.logger.info('Show chats posted to sidebar webview', { delivered });
      },
      (error) => {
        this.logger.error('Failed to post show chats to sidebar webview', error);
      }
    );
  }

  private postPage(surface: WebviewSurface, page: 'chat' | 'settings'): void {
    postWebviewPage(surface, page, this.logger);
  }

  async loginCodex(): Promise<void> {
    await new VscodeCodexLoginAdapter(this.codexAuthProvider, this.logger).login();
    await this.refreshCodexAuthState();
    await this.refreshModels(true);
    this.sendState();
  }

  async logoutCodex(): Promise<void> {
    await new VscodeCodexLoginAdapter(this.codexAuthProvider, this.logger).logout();
    await this.refreshCodexAuthState();
    this.sendState();
  }

  private async refreshCodexAuthState(): Promise<void> {
    try {
      this.codexAuthenticated = await this.codexAuthProvider.isAuthenticated();
      this.sendState();
    } catch (error) {
      this.codexAuthenticated = false;
      this.logger.error('Failed to read ChatGPT Codex auth state', error);
    }
  }

  private sendState(targetSurface?: WebviewSurface): void {
    sendAgentState({
      extensionVersion: String(this.context.extension.packageJSON?.version || '0.0.0'),
      surfaces: targetSurface ? [targetSurface] : this.getSurfaces(),
      chats: this.chats,
      logger: this.logger,
      modelOptions: this.modelOptions,
      codexAuthenticated: this.codexAuthenticated,
      getSystemPrompt: () => buildAgentSystemPrompt()
    });
  }

  private async refreshModels(force = false): Promise<void> {
    try {
      this.modelOptions = [...(await this.daemonRuntime.refreshModels(force))];
      this.sendState();
    } catch (error) {
      this.logger.error('Failed to refresh models from daemon', error);
      this.modelOptions = [...FALLBACK_MODEL_OPTIONS];
      this.sendState();
    }
  }

  private async refreshToolCatalog(): Promise<void> {
    await refreshDaemonToolCatalog({
      skills: getAgentSkills(),
      disabledProjectToolIds: getDisabledProjectToolIds(),
      workspaceRoot: this.daemonRuntime.workspaceRoot
    }).catch((error) => this.logger.error('Failed to refresh daemon tool catalog metadata', error));
  }

  private async syncLegacyOpenRouterApiKey(): Promise<void> {
    const apiKey = vscode.workspace.getConfiguration('openrouterAgent').get<string>('apiKey')?.trim();
    if (!apiKey) {
      return;
    }

    const current = await this.secretStore.get(OPENROUTER_API_KEY_SECRET_KEY);
    if (current === apiKey) {
      return;
    }

    await this.secretStore.store(OPENROUTER_API_KEY_SECRET_KEY, apiKey);
    this.logger.info('Synced legacy VS Code OpenRouter API key setting into the daemon global secret store');
  }
}

function toToolApprovalDecision(message: Extract<WebviewMessage, { type: 'resolveToolCall' }>): ToolApprovalDecision {
  return {
    approved: message.decision === 'approve',
    continueAfterDeny: message.decision === 'deny-continue',
    comment: message.comment?.trim() || undefined,
    rememberGlobal: message.rememberGlobal?.trim() || undefined,
    rememberProject: message.rememberProject?.trim() || undefined
  };
}

function formatChatErrorMessage(error: unknown, context?: string): string {
  const title = context ? `AIST error (${context})` : 'AIST error';
  return [`**${title}**`, '', getErrorMessage(error)].join('\n');
}
