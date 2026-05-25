import * as vscode from 'vscode';

import { ChatStore } from '../chats/chatStore';
import { CodexClient } from '../codex/client';
import { OpenRouterClient } from '../openrouter/client';
import type { OpenRouterMessage, OpenRouterTool } from '../openrouter/types';
import { t } from '../shared/i18n';
import type { AistLogger } from '../shared/logger';
import { editSelection as runEditSelectionCommand } from './commands/editSelection';
import { openWorkspaceFile as openWorkspaceFileFromWebview } from './commands/openWorkspaceFile';
import { initializeAgentConfigStore } from './config/agentConfigStore';
import { getCompactionSettings } from './config/compaction';
import { getConfiguredModel } from './config/settingsSnapshot';
import { buildAgentSystemPrompt } from './config/systemPrompt';
import { AgentModelCatalog } from './models/catalog';
import { isCodexModel } from './models/models';
import { AgentRunService } from './runtime/runService';
import { getChatContextEstimate, getMessageUsageEstimate } from './runtime/usage';
import type { WebviewMessage, WebviewSurface } from './types';
import { createSidebar, openAgentChatEditor, resolveAgentSidebarWebview } from './webview/host';
import { handleAgentWebviewMessage } from './webview/messages';
import { postWebviewPage } from './webview/page';
import { sendAgentState } from './webview/statePresenter';

const COMPACTION_SYSTEM_PROMPT = [
  'You summarize coding-agent chat history for context compaction.',
  'Create a dense handoff summary that will be used as the first message in a new chat.',
  'Preserve user goals, decisions, constraints, files changed, commands run, current status, open tasks, and important errors.',
  'Do not include irrelevant chatter. Be concise but complete. Write in the same language as the conversation.'
].join(' ');

function createCompactionMessages(history: OpenRouterMessage[]): OpenRouterMessage[] {
  const serialized = history
    .filter((message) => message.role !== 'system')
    .map((message, index) => {
      const toolCalls = message.tool_calls?.length ? `\nTool calls: ${JSON.stringify(message.tool_calls)}` : '';
      const toolId = message.tool_call_id ? `\nTool call id: ${message.tool_call_id}` : '';
      return `#${index + 1} ${message.role}\n${message.content || ''}${toolCalls}${toolId}`;
    })
    .join('\n\n---\n\n');

  return [
    { role: 'system', content: COMPACTION_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Summarize this chat history for context compaction. The next chat will only receive your summary, not the original history.\n\n${serialized}`
    }
  ];
}

/**
 * Тонкий координатор VS Code extension commands и webview surfaces.
 *
 * Контроллер намеренно не содержит agent loop, tool execution, state-presenter
 * или обработку отдельных webview-команд. Он связывает VS Code API с сервисами
 * слоя agent и хранит только состояние открытых поверхностей и авторизации.
 */
export class AgentController {
  private sidebarView: vscode.WebviewView | undefined;
  private sidebarChatId: string | undefined;
  private sidebarPage: 'chat' | 'settings' = 'chat';
  private readonly editorSurfaces = new Map<string, WebviewSurface>();
  private readonly openRouterClient = new OpenRouterClient();
  private readonly codexClient: CodexClient;
  private readonly modelCatalog: AgentModelCatalog;
  private readonly runService: AgentRunService;
  private codexAuthenticated = false;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly chats: ChatStore,
    private readonly logger: AistLogger
  ) {
    initializeAgentConfigStore(context);
    this.codexClient = new CodexClient(context, logger);
    this.modelCatalog = new AgentModelCatalog(this.openRouterClient, this.codexClient, logger, () => this.sendState());
    this.runService = new AgentRunService({
      chats: this.chats,
      logger: this.logger,
      sendState: () => this.sendState(),
      getSystemPrompt: () => this.getSystemPrompt(),
      getModelOption: (modelId) => this.modelCatalog.getOption(modelId),
      chat: (messages, tools, modelOverride, signal) => this.chat(messages, tools, modelOverride, signal)
    });
    void this.refreshCodexAuthState();
    this.logger.info('AgentController initialized', {
      activeChatId: this.chats.getActiveChat().id,
      chatCount: this.chats.getSummaries().length
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

  openSettings(): void {
    this.logger.info('openSettings command received');
    this.sidebarPage = 'settings';
    void vscode.commands.executeCommand('workbench.view.extension.openrouterAgent');
    this.postSidebarPage();
  }

  async openStorage(): Promise<void> {
    const uri = this.context.storageUri || this.context.globalStorageUri;
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

  createChat(): void {
    this.logger.info('newChat command received');

    const chat = this.chats.createChat(getConfiguredModel());
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
    await runEditSelectionCommand({
      chats: this.chats,
      getSystemPrompt: () => this.getSystemPrompt(),
      chat: (messages, tools, modelOverride, signal) => this.chat(messages, tools, modelOverride, signal)
    });
  }

  private async ask(chatId: string, prompt: string): Promise<void> {
    await this.runService.ask(chatId, prompt);
    await this.compactChatIfNeeded(chatId);
  }

  private async handleWebviewMessage(surface: WebviewSurface, message: WebviewMessage): Promise<void> {
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
      compactChat: (chatId, trigger) => this.compactChat(chatId, trigger),
      openChatInEditor: (chatId) => this.openChatInEditor(chatId),
      retargetDeletedChat: (deletedChatId, nextChatId) => this.retargetDeletedChat(deletedChatId, nextChatId),
      loginCodex: () => this.loginCodex(),
      logoutCodex: () => this.logoutCodex(),
      resolveToolCall: (messageId, approved) => this.runService.resolveToolCall(messageId, approved),
      openWorkspaceFile: (filePath, line, column) => this.openWorkspaceFile(filePath, line, column),
      stopCurrentRun: () => this.runService.stop()
    });
  }

  private async compactChatIfNeeded(chatId: string): Promise<void> {
    const settings = getCompactionSettings();
    if (!settings.enabled) {
      return;
    }

    const chat = this.chats.getChat(chatId);
    if (!chat || chat.busy || chat.previousChatId) {
      return;
    }

    const model = this.modelCatalog.getOption(chat.model);
    const context = getChatContextEstimate(chat.history, this.getSystemPrompt(), model);
    if (context.percent === undefined || context.percent < settings.thresholdPercent) {
      return;
    }

    await this.compactChat(chat.id, 'auto');
  }

  private async compactChat(chatId: string, trigger: 'manual' | 'auto'): Promise<{ id: string }> {
    const source = this.chats.getChat(chatId) || this.chats.getActiveChat();
    if (source.busy) {
      throw new Error('Cannot compact a chat while it is running.');
    }

    const args = { chatId: source.id, trigger };
    const toolMessage = this.chats.appendMessage(source.id, {
      role: 'tool',
      name: 'compact_chat',
      status: 'running',
      reason: trigger === 'auto' ? 'Context token limit reached.' : 'Requested by user.',
      args
    });
    this.chats.setBusy(source.id, true);
    this.chats.setActivity(source.id, 'runningTool', 'Summarizing chat history for context compaction.');
    this.sendState();

    try {
      const summary = await this.summarizeChat(source.id);
      this.chats.setActivity(source.id, undefined);
      this.chats.setBusy(source.id, false);
      const chat = this.chats.compactChat(source.id, summary);
      const result = {
        ok: true,
        sourceChatId: source.id,
        chatId: chat.id,
        summary,
        summaryLength: summary.length,
        trigger
      };
      this.chats.updateMessage(source.id, toolMessage.id, {
        status: 'done',
        result,
        usage: getMessageUsageEstimate(result)
      });
      this.logger.info('Chat compacted', {
        sourceChatId: source.id,
        chatId: chat.id,
        trigger,
        summaryLength: summary.length
      });
      this.sendState();
      return chat;
    } catch (error) {
      const result = { ok: false, error: error instanceof Error ? error.message : String(error), trigger };
      this.chats.updateMessage(source.id, toolMessage.id, {
        status: 'error',
        result,
        usage: getMessageUsageEstimate(result)
      });
      this.logger.error('Failed to compact chat', error);
      this.sendState();
      throw error;
    } finally {
      const current = this.chats.getChat(source.id);
      if (current) {
        this.chats.setActivity(source.id, undefined);
        this.chats.setBusy(source.id, false);
      }
    }
  }

  private async summarizeChat(chatId: string): Promise<string> {
    const chat = this.chats.getChat(chatId) || this.chats.getActiveChat();
    const messages = createCompactionMessages(chat.history);
    const response = await this.chat(messages, undefined, chat.model);
    const summary = response.content?.trim();
    if (!summary) {
      throw new Error('Model returned an empty compaction summary.');
    }
    return summary;
  }

  private async openWorkspaceFile(filePath: string, line?: number, column?: number): Promise<void> {
    await openWorkspaceFileFromWebview({ filePath, line, column, logger: this.logger });
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

  private postPage(surface: WebviewSurface, page: 'chat' | 'settings'): void {
    postWebviewPage(surface, page, this.logger);
  }

  private getSystemPrompt(): string {
    return buildAgentSystemPrompt();
  }

  async loginCodex(): Promise<void> {
    await this.codexClient.login();
    await this.refreshCodexAuthState();
    await this.refreshModels(true);
    this.sendState();
  }

  async logoutCodex(): Promise<void> {
    await this.codexClient.logout();
    await this.refreshCodexAuthState();
    this.sendState();
  }

  private async refreshCodexAuthState(): Promise<void> {
    try {
      this.codexAuthenticated = await this.codexClient.isAuthenticated();
      this.sendState();
    } catch (error) {
      this.codexAuthenticated = false;
      this.logger.error('Failed to read ChatGPT Codex auth state', error);
    }
  }

  private async chat(
    messages: OpenRouterMessage[],
    tools?: OpenRouterTool[],
    modelOverride?: string,
    signal?: AbortSignal
  ): Promise<OpenRouterMessage> {
    if (isCodexModel(modelOverride)) {
      return this.codexClient.chat(messages, tools, modelOverride, signal);
    }

    return this.openRouterClient.chat(messages, tools, modelOverride, signal);
  }

  private sendState(targetSurface?: WebviewSurface): void {
    sendAgentState({
      surfaces: targetSurface ? [targetSurface] : this.getSurfaces(),
      chats: this.chats,
      logger: this.logger,
      modelOptions: this.modelCatalog.getOptions(),
      codexAuthenticated: this.codexAuthenticated,
      getSystemPrompt: () => this.getSystemPrompt()
    });
  }

  private async refreshModels(force = false): Promise<void> {
    await this.modelCatalog.refresh(force);
  }
}
