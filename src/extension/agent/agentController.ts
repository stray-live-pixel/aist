import path from 'node:path';
import * as vscode from 'vscode';

import type { DaemonEvent } from '../../cli/daemonProtocol';
import { FileSecretStore, OPENROUTER_API_KEY_SECRET_KEY } from '../../core/app/config/config';
import { CodexAuthSessionProvider } from '../../core/entities/model/codexAuth';
import { FALLBACK_MODEL_OPTIONS } from '../../core/entities/model/modelDefaults';
import { initializeTelemetryStore } from '../../core/features/telemetry/telemetry';
import type { ModelProvider, OpenRouterModelOption, ToolApprovalDecision } from '../../core/shared/types/types';
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
import { getConfiguredModel, getDefaultModelSettings } from './config/settingsSnapshot';
import { buildAgentSystemPrompt } from './config/systemPrompt';
import { replaceSelection, stripCodeFence } from './context/editorContext';
import type { VscodeDaemonRuntimeBridge } from './daemon/bridge';
import { refreshDaemonToolCatalog } from './daemon/toolCatalog';
import type { WebviewMessage, WebviewSurface } from './types';
import { type ChatVcsService, buildMergeToMainPrompt, createChatVcsService } from './vcs/chatVcs';
import {
  AGENT_CHAT_EDITOR_VIEW_TYPE,
  createSidebar,
  deserializeAgentChatEditor,
  openAgentChatEditor,
  resolveAgentSidebarWebview
} from './webview/host';
import { mapDaemonEventToChatPatch } from './webview/mapDaemonEventToChatPatch';
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
  private readonly chatVcs: ChatVcsService;
  private suppressedChatStoreStateBroadcasts = 0;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly chats: AgentChatStore,
    private readonly logger: AistLogger,
    private readonly daemonRuntime: VscodeDaemonRuntimeBridge
  ) {
    this.chatVcs = createChatVcsService({ workspaceRoot: daemonRuntime.workspaceRoot });
    initializeAgentConfigStore(context);
    initializeTelemetryStore({
      fallbackRoot: context.globalStorageUri.fsPath
    });
    this.secretStore = new FileSecretStore({
      logger: { warn: (message, details) => this.logger.info(message, details) }
    });
    this.codexAuthProvider = new CodexAuthSessionProvider(this.secretStore, { logger });
    this.context.subscriptions.push(this.chats.onDidChange(() => this.handleChatStoreChange()));
    this.context.subscriptions.push({ dispose: this.daemonRuntime.onEvent((event) => this.postChatPatch(event)) });

    void this.syncLegacyOpenRouterApiKey().catch((error) =>
      this.logger.error('Failed to sync legacy VS Code OpenRouter API key setting', error)
    );
    void this.refreshToolCatalog();
    void this.refreshActiveChatVcs();
    void this.refreshCodexAuthState();
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

  async deserializeWebviewPanel(panel: vscode.WebviewPanel, state: unknown): Promise<void> {
    deserializeAgentChatEditor(panel, state, this.getWebviewHostDeps());
  }

  get chatEditorViewType(): string {
    return AGENT_CHAT_EDITOR_VIEW_TYPE;
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
      refreshModels: (provider?: ModelProvider) => {
        void this.refreshModels(true, provider || 'all');
      }
    };
  }

  async createChat(): Promise<void> {
    this.logger.info('newChat command received');

    const chat = await this.daemonRuntime.createChat(getDefaultModelSettings());
    this.sidebarPage = 'chat';

    this.logger.info('Chat created from command', {
      chatId: chat.id,
      title: chat.title,
      chatCount: this.chats.getSummaries().length,
      surfaces: this.getSurfaces().map((surface) => surface.id)
    });

    this.openChatInEditor(chat.id);
    this.sendState();
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

  private async ask(chatId: string, prompt: string, options: { skipUserMessage?: boolean } = {}): Promise<void> {
    await this.syncLegacyOpenRouterApiKey();
    await this.daemonRuntime.ask(chatId, prompt, options);
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
      secretStore: this.secretStore,
      getSidebarPage: () => this.sidebarPage,
      setSidebarPage: (page) => {
        this.sidebarPage = page;
      },
      sendState: (targetSurface) => this.sendState(targetSurface),
      postPage: (targetSurface, page) => this.postPage(targetSurface, page),
      refreshModels: (provider?: ModelProvider) => {
        void this.refreshModels(true, provider || 'all');
      },
      refreshCodexAuthState: () => {
        void this.refreshCodexAuthState();
      },
      ask: (chatId, prompt) => this.ask(chatId, prompt),
      compactChat: (chatId, trigger) => this.daemonRuntime.compactChat(chatId, trigger),
      saveReflectionCandidate: (chatId, candidateId) => this.daemonRuntime.saveReflectionCandidate(chatId, candidateId),
      rejectReflectionCandidate: (chatId, candidateId) =>
        this.daemonRuntime.rejectReflectionCandidate(chatId, candidateId),
      openChatInEditor: (chatId) => this.openChatInEditor(chatId),
      retargetDeletedChat: (deletedChatId, nextChatId) => this.retargetDeletedChat(deletedChatId, nextChatId),
      loginCodex: () => this.loginCodex(),
      logoutCodex: () => this.logoutCodex(),
      resolveToolCall: (messageId, decision) => this.daemonRuntime.resolveToolCall(messageId, decision),
      syncToolPermissions: () => this.daemonRuntime.syncToolPermissions(),
      openWorkspaceFile: (filePath, line, column, endLine, endColumn) =>
        this.openWorkspaceFile(filePath, line, column, endLine, endColumn),
      stopCurrentRun: (chatId) => this.daemonRuntime.stop(chatId).then(() => this.sendState()),
      refreshChatVcs: (chatId) => this.refreshChatVcs(chatId),
      isolateChatVcs: (chatId) => this.isolateChatVcs(chatId),
      commitAndForcePushChatVcs: (chatId) => this.commitAndForcePushChatVcs(chatId),
      mergeChatVcsToMain: (chatId) => this.mergeChatVcsToMain(chatId)
    });
  }

  private async handleDaemonWebviewMessage(surface: WebviewSurface, message: WebviewMessage): Promise<boolean> {
    switch (message.type) {
      case 'ask':
        await this.ask(surface.getChatId(), message.prompt, { skipUserMessage: message.continueWithoutUserPrompt });
        return true;
      case 'newChat': {
        const chat = await this.daemonRuntime.createChat(getDefaultModelSettings());
        this.sidebarPage = 'chat';
        this.openChatInEditor(chat.id);
        this.sendState();
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
        this.sendState();
        return true;
      }
      case 'setChatModelSettings': {
        const chat = this.chats.getChat(surface.getChatId()) || this.chats.getActiveChat();
        await this.daemonRuntime.setModelSettings(chat.id, message.settings);
        this.sendState();
        return true;
      }
      case 'resetChatModelSettings': {
        const chat = this.chats.getChat(surface.getChatId()) || this.chats.getActiveChat();
        await this.daemonRuntime.setModelSettings(chat.id, getDefaultModelSettings());
        this.sendState();
        return true;
      }
      case 'refreshModelsForProvider':
        await this.refreshModels(true, message.provider);
        return true;
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
      case 'runMemoryAnalysis':
        await this.daemonRuntime.analyzeMemoryChat(message.chatId || surface.getChatId());
        this.sendState(surface);
        return true;
      case 'resolveToolCall':
        await this.daemonRuntime.resolveToolCall(message.messageId, toToolApprovalDecision(message));
        return true;
      case 'stop':
        await this.daemonRuntime.stop(message.chatId || surface.getChatId());
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

  private async refreshActiveChatVcs(): Promise<void> {
    await this.refreshChatVcs(this.chats.getActiveChat().id).catch((error) =>
      this.logger.info('Failed to refresh active chat VCS state', {
        error: error instanceof Error ? error.message : String(error)
      })
    );
  }

  private async refreshChatVcs(chatId: string): Promise<void> {
    const state = await this.chatVcs.getCurrentState();
    this.chats.setVcsState(chatId, state);
    this.sendState();
  }

  private async isolateChatVcs(chatId: string): Promise<void> {
    const state = await this.chatVcs.createIsolatedBranch(chatId);
    this.chats.setVcsState(chatId, state);
    this.sendState();
    vscode.window.setStatusBarMessage(`AIST VCS: switched to ${state.branch}`, 2400);
  }

  private async commitAndForcePushChatVcs(chatId: string): Promise<void> {
    const chat = this.chats.getChat(chatId) || this.chats.getActiveChat();
    const state = await this.chatVcs.commitAndForcePush(`AIST changes from ${chat.title}`);
    this.chats.setVcsState(chat.id, state);
    this.sendState();
    vscode.window.setStatusBarMessage(`AIST VCS: pushed ${state.branch} with --force`, 2400);
  }

  private async mergeChatVcsToMain(chatId: string): Promise<void> {
    const chat = this.chats.getChat(chatId) || this.chats.getActiveChat();
    const prompt = buildMergeToMainPrompt(chat.vcs);
    await this.ask(chat.id, prompt);
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

  private handleChatStoreChange(): void {
    queueMicrotask(() => {
      if (this.suppressedChatStoreStateBroadcasts > 0) {
        this.suppressedChatStoreStateBroadcasts -= 1;
        this.logger.info('Full state broadcast skipped because chat.patch will cover this backend update');
        return;
      }

      this.sendState();
    });
  }

  private postChatPatch(event: DaemonEvent): void {
    const patch = mapDaemonEventToChatPatch(event, this.chats);
    if (!patch) {
      return;
    }

    this.suppressedChatStoreStateBroadcasts += 1;

    for (const surface of this.getSurfaces()) {
      void surface.webview.postMessage(patch).then(
        (delivered) => {
          this.logger.info('Chat patch posted to webview', {
            surfaceId: surface.id,
            kind: surface.kind,
            chatId: patch.chatId,
            reason: patch.reason,
            delivered
          });
        },
        (error) => {
          this.logger.error('Failed to post chat patch to webview', error);
        }
      );
    }
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
    const surfaces = targetSurface ? [targetSurface] : this.getSurfaces();
    void Promise.all(surfaces.map((surface) => this.daemonRuntime.listSubagentRuns(surface.getChatId())))
      .then((runsBySurface) => {
        sendAgentState({
          extensionVersion: String(this.context.extension.packageJSON?.version || '0.0.0'),
          surfaces,
          chats: this.chats,
          logger: this.logger,
          secretStore: this.secretStore,
          modelOptions: this.modelOptions,
          codexAuthenticated: this.codexAuthenticated,
          subagentRunsByChatId: new Map(
            surfaces.map((surface, index) => [surface.getChatId(), [...runsBySurface[index]]])
          ),
          getSystemPrompt: () => buildAgentSystemPrompt()
        });
      })
      .catch((error) => {
        this.logger.error('Failed to load subagent runs for webview state', error);
        sendAgentState({
          extensionVersion: String(this.context.extension.packageJSON?.version || '0.0.0'),
          surfaces,
          chats: this.chats,
          logger: this.logger,
          secretStore: this.secretStore,
          modelOptions: this.modelOptions,
          codexAuthenticated: this.codexAuthenticated,
          subagentRunsByChatId: new Map(),
          getSystemPrompt: () => buildAgentSystemPrompt()
        });
      });
  }

  private async refreshModels(force = false, provider: ModelProvider | 'all' = 'all'): Promise<void> {
    try {
      const loadedModels = [...(await this.daemonRuntime.refreshModels(force, provider))];
      this.modelOptions =
        provider === 'all' ? loadedModels : mergeModelOptionsByProvider(this.modelOptions, loadedModels, provider);
      this.sendState();
    } catch (error) {
      this.logger.error('Failed to refresh models from daemon', error);
      this.modelOptions = provider === 'all' ? [...FALLBACK_MODEL_OPTIONS] : this.modelOptions;
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

function mergeModelOptionsByProvider(
  current: OpenRouterModelOption[],
  loaded: OpenRouterModelOption[],
  provider: ModelProvider
): OpenRouterModelOption[] {
  const retained = current.filter((model) => (model.provider || 'openrouter') !== provider);
  const byId = new Map<string, OpenRouterModelOption>();
  for (const model of [...retained, ...loaded]) {
    byId.set(model.id, model);
  }
  return [...byId.values()];
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
