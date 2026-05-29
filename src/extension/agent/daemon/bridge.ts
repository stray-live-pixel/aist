import * as vscode from 'vscode';

import type { DaemonJsonRpcClient } from '../../../cli/daemonClient';
import type {
  DaemonChatAskResult,
  DaemonChatClearResult,
  DaemonChatCompactResult,
  DaemonChatCreateResult,
  DaemonChatDeleteResult,
  DaemonChatGetResult,
  DaemonChatSetModelResult,
  DaemonChatSetModelSettingsResult,
  DaemonChatStopResult,
  DaemonClientCapabilitiesResult,
  DaemonClientNotificationParams,
  DaemonClientOpenWorkspaceFileParams,
  DaemonClientPreviewApproveParams,
  DaemonClientPreviewCleanupParams,
  DaemonClientPreviewPrepareParams,
  DaemonConfigUpdateResult,
  DaemonEvent,
  DaemonInitializeResult,
  DaemonModelsResult,
  DaemonState
} from '../../../cli/daemonProtocol';
import type {
  ChatModelSettings,
  JsonObject,
  ModelProvider,
  OpenRouterModelOption,
  ToolApprovalDecision
} from '../../../core/shared/types/types';
import type { AgentChatStore } from '../../chats/chatDataStore';
import type { Chat } from '../../chats/types';
import type { AistLogger } from '../../shared/logger';
import { openWorkspaceFile as openWorkspaceFileFromWebview } from '../commands/openWorkspaceFile';
import { getProviderProfiles } from '../config/providerProfiles';
import { getAgentLanguage } from '../config/settings';
import { getAgentSettingsSnapshot, getDefaultModelSettings } from '../config/settingsSnapshot';
import { getDaemonEventChatId } from '../webview/getDaemonEventChatId';
import { DaemonChatStore } from './chatStore';
import { VscodeDaemonProcessManager } from './processManager';
import {
  VscodeActiveEditorContextAdapter,
  type VscodePreviewEdit,
  VscodePreviewEditAdapter,
  VscodeStatusNotificationAdapter
} from './vscodeAdapters';

export const DAEMON_RUNTIME_ACTIVE_CHAT_ID_KEY = 'daemonRuntime.activeChatId';

export type VscodeDaemonRuntimeBridge = vscode.Disposable & {
  mode: 'daemon';
  workspaceRoot: string;
  chats: AgentChatStore;
  processManager: VscodeDaemonProcessManager;
  createChat(settings?: ChatModelSettings): Promise<Chat>;
  deleteChat(chatId: string, fallbackModel?: string): Promise<Chat>;
  clearChat(chatId: string): Promise<void>;
  setModel(chatId: string, model: string): Promise<void>;
  setModelSettings(chatId: string, settings: Partial<ChatModelSettings>): Promise<void>;
  ask(chatId: string, prompt: string, options?: { skipUserMessage?: boolean }): Promise<void>;
  stop(chatId?: string): Promise<void>;
  compactChat(chatId: string, trigger: 'manual' | 'auto'): Promise<{ id: string }>;
  resolveToolCall(messageId: string, decision: ToolApprovalDecision): Promise<void>;
  refreshModels(force?: boolean, provider?: ModelProvider | 'all'): Promise<readonly OpenRouterModelOption[]>;
  refreshState(): Promise<void>;
  onEvent(listener: (event: DaemonEvent) => void): () => void;
};

export async function createVscodeDaemonRuntimeBridge(
  context: vscode.ExtensionContext,
  logger: AistLogger,
  defaultModel: string
): Promise<VscodeDaemonRuntimeBridge> {
  const workspaceRoot = getWorkspaceRoot();
  const manager = new VscodeDaemonProcessManager({ context, workspaceRoot, logger });
  const bridge = new VscodeDaemonRuntimeBridgeImpl(context, logger, manager, workspaceRoot, defaultModel);
  await bridge.initialize();
  context.subscriptions.push(bridge);
  return bridge;
}

class VscodeDaemonRuntimeBridgeImpl implements VscodeDaemonRuntimeBridge {
  readonly mode = 'daemon' as const;
  readonly chats = new DaemonChatStore();

  private readonly activeEditorContextProvider = new VscodeActiveEditorContextAdapter();
  private readonly previewEditProvider = new VscodePreviewEditAdapter();
  private readonly notifier = new VscodeStatusNotificationAdapter();
  private readonly previewHandles = new Map<string, VscodePreviewEdit>();
  private client: DaemonJsonRpcClient | undefined;
  private readonly eventListeners = new Set<(event: DaemonEvent) => void>();
  private lastSyncedSettings = '';
  private refreshQueue = Promise.resolve();
  private disposed = false;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly logger: AistLogger,
    readonly processManager: VscodeDaemonProcessManager,
    readonly workspaceRoot: string,
    private readonly defaultModel: string
  ) {}

  async initialize(): Promise<void> {
    const client = await this.getClient();
    await client.request<DaemonInitializeResult>('initialize');
    await this.refreshState();
    if (!this.chats.getSummaries().length) {
      await this.createChat(this.getDefaultModelSettings());
    }
    this.logger.info('VS Code daemon runtime bridge initialized', {
      workspaceRoot: this.workspaceRoot,
      chatCount: this.chats.getSummaries().length,
      socketPath: this.processManager.socketPath
    });
  }

  dispose(): void {
    this.disposed = true;
    for (const handle of this.previewHandles.values()) {
      void handle.cleanup();
    }
    this.previewHandles.clear();
    this.client?.close();
    this.processManager.dispose();
  }

  async createChat(settings: ChatModelSettings = this.getDefaultModelSettings()): Promise<Chat> {
    const client = await this.getClient();
    await this.syncSettings();
    const result = await client.request<DaemonChatCreateResult>('chat.create', {
      model: settings.model,
      modelSettings: settings
    });
    const chat = this.chats.upsert(result.chat);
    this.chats.setActiveChat(chat.id);
    await this.saveActiveChatId(chat.id);
    return chat;
  }

  async deleteChat(chatId: string, fallbackModel: string = this.defaultModel): Promise<Chat> {
    const client = await this.getClient();
    const result = await client.request<DaemonChatDeleteResult>('chat.delete', { chatId });
    await this.refreshState(result.nextChatId);
    if (!this.chats.getSummaries().length) {
      return this.createChat({ ...this.getDefaultModelSettings(), model: fallbackModel });
    }
    const active = result.nextChatId ? this.chats.setActiveChat(result.nextChatId) : this.chats.getActiveChat();
    await this.saveActiveChatId(active.id);
    return active;
  }

  async clearChat(chatId: string): Promise<void> {
    const client = await this.getClient();
    const result = await client.request<DaemonChatClearResult>('chat.clear', { chatId });
    this.chats.upsert(result.chat);
  }

  async setModel(chatId: string, model: string): Promise<void> {
    const client = await this.getClient();
    const result = await client.request<DaemonChatSetModelResult>('chat.setModel', { chatId, model });
    this.chats.upsert(result.chat);
  }

  async setModelSettings(chatId: string, settings: Partial<ChatModelSettings>): Promise<void> {
    const client = await this.getClient();
    const result = await client.request<DaemonChatSetModelSettingsResult>('chat.setModelSettings', {
      chatId,
      settings
    });
    this.chats.upsert(result.chat);
  }

  async ask(chatId: string, prompt: string, options: { skipUserMessage?: boolean } = {}): Promise<void> {
    const client = await this.getClient();
    await this.syncSettings();
    await client.request<DaemonChatAskResult>('chat.ask', { chatId, prompt, skipUserMessage: options.skipUserMessage });
    await this.refreshChat(chatId);
  }

  async stop(chatId?: string): Promise<void> {
    const client = await this.getClient();
    await client.request<DaemonChatStopResult>('chat.stop', chatId ? { chatId } : undefined);
    await this.refreshState();
  }

  async compactChat(chatId: string, _trigger: 'manual' | 'auto'): Promise<{ id: string }> {
    const client = await this.getClient();
    const result = await client.request<DaemonChatCompactResult>('chat.compact', { chatId });
    const chat = this.chats.upsert(result.chat);
    this.chats.setActiveChat(chat.id);
    await this.saveActiveChatId(chat.id);
    return { id: chat.id };
  }

  async resolveToolCall(messageId: string, decision: ToolApprovalDecision): Promise<void> {
    const client = await this.getClient();
    await client.request('approval.resolve', { messageId, ...decision });
  }

  async refreshModels(
    force = false,
    provider: ModelProvider | 'all' = 'all'
  ): Promise<readonly OpenRouterModelOption[]> {
    const client = await this.getClient();
    const result = await client.request<DaemonModelsResult>(force ? 'models.refresh' : 'models.list', {
      provider
    });
    return result.models;
  }

  onEvent(listener: (event: DaemonEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  async refreshState(activeChatId?: string): Promise<void> {
    const client = await this.getClient();
    const state = await client.request<DaemonState>('state.get');
    const chats = await Promise.all(
      state.chats.map(async (summary) => {
        const result = await client.request<DaemonChatGetResult>('chat.get', { chatId: summary.id });
        return result.chat;
      })
    );
    const savedActiveChatId = this.context.workspaceState.get<string>(DAEMON_RUNTIME_ACTIVE_CHAT_ID_KEY);
    this.chats.replaceAll(chats, activeChatId || savedActiveChatId || state.activeRun?.chatId);
  }

  private async getClient(): Promise<DaemonJsonRpcClient> {
    const client = await this.processManager.getClient();
    if (client !== this.client) {
      this.client = client;
      await this.registerCapabilities(client);
      await client.subscribe();
      client.onEvent((event) => this.queueRefresh(event));
    }
    return client;
  }

  private async registerCapabilities(client: DaemonJsonRpcClient): Promise<void> {
    client.onRequest(
      'client.activeEditorContext',
      async () => this.activeEditorContextProvider.getEditorContext() || null
    );
    client.onRequest('client.notification', async (params) => this.handleNotification(params));
    client.onRequest('client.openWorkspaceFile', async (params) => this.openWorkspaceFile(params));
    client.onRequest('client.previewEdit.prepare', async (params) => this.preparePreview(params));
    client.onRequest('client.previewEdit.approve', async (params) => this.approvePreview(params));
    client.onRequest('client.previewEdit.cleanup', async (params) => this.cleanupPreview(params));
    await client.request<DaemonClientCapabilitiesResult>('client.capabilities', {
      capabilities: {
        activeEditorContext: true,
        notifications: true,
        openWorkspaceFile: true,
        vscodeEditableDiffPreview: true
      }
    });
  }

  private queueRefresh(event: DaemonEvent): void {
    if (this.disposed) {
      return;
    }

    if (event.type.startsWith('autonomous.')) {
      return;
    }

    this.refreshQueue = this.refreshQueue
      .then(async () => {
        const chatId = getDaemonEventChatId(event);
        if (chatId) {
          await this.refreshChat(chatId);
        } else {
          await this.refreshState();
        }
        this.notifyEventListeners(event);
      })
      .catch((error) => this.logger.error('Failed to refresh daemon state after event', error));
  }

  private notifyEventListeners(event: DaemonEvent): void {
    for (const listener of [...this.eventListeners]) {
      listener(event);
    }
  }

  private async refreshChat(chatId: string): Promise<void> {
    const client = await this.getClient();
    const result = await client.request<DaemonChatGetResult>('chat.get', { chatId });
    this.chats.upsert(result.chat);
  }

  private getDefaultModelSettings(): ChatModelSettings {
    const settings = getDefaultModelSettings();
    return { ...settings, model: settings.model || this.defaultModel };
  }

  private async syncSettings(): Promise<void> {
    const snapshot = getAgentSettingsSnapshot();
    const payload = {
      model: snapshot.configuredModel,
      maxToolIterations: snapshot.maxToolIterations,
      reasoningEffort: snapshot.reasoningEffort,
      codexServiceTier: snapshot.codexServiceTier,
      streamingEnabled: snapshot.streamingEnabled,
      providerProfiles: getProviderProfiles(),
      language: getAgentLanguage(),
      toolPermissions:
        vscode.workspace.getConfiguration('openrouterAgent').get<Record<string, unknown>>('toolPermissions') || {},
      projectToolDisabledIds:
        vscode.workspace.getConfiguration('openrouterAgent').get<readonly string[]>('projectToolDisabledIds') || []
    };
    const serialized = JSON.stringify(payload);
    if (serialized === this.lastSyncedSettings) {
      return;
    }

    for (const [key, value] of Object.entries(payload)) {
      await this.updateDaemonConfig(key, value);
    }
    this.lastSyncedSettings = serialized;
  }

  private async updateDaemonConfig(key: string, value: unknown): Promise<void> {
    const client = await this.getClient();
    await client.request<DaemonConfigUpdateResult>('config.update', {
      key,
      value,
      scope: 'workspace'
    });
  }

  private async handleNotification(params: DaemonClientNotificationParams): Promise<{ shown: boolean }> {
    if (params.level === 'warning') {
      this.notifier.showWarning(params.message);
    } else {
      this.notifier.setStatus(params.message, params.timeoutMs || 2400);
    }
    return { shown: true };
  }

  private async openWorkspaceFile(params: DaemonClientOpenWorkspaceFileParams): Promise<{ opened: boolean }> {
    await openWorkspaceFileFromWebview({
      filePath: params.path,
      line: params.line,
      column: params.column,
      endLine: params.endLine,
      endColumn: params.endColumn,
      logger: this.logger
    });
    return { opened: true };
  }

  private async preparePreview(params: DaemonClientPreviewPrepareParams): Promise<{ preview?: JsonObject }> {
    const preview = await this.previewEditProvider.prepare(params.toolName, params.args);
    if (!preview) {
      return {};
    }

    this.previewHandles.set(params.previewId, preview);
    return {
      preview: preview.preview as JsonObject
    };
  }

  private async approvePreview(params: DaemonClientPreviewApproveParams): Promise<JsonObject> {
    const preview = this.previewHandles.get(params.previewId);
    if (!preview) {
      return { ok: false, error: 'Preview is no longer available.' };
    }

    return (await preview.approve()) as JsonObject;
  }

  private async cleanupPreview(params: DaemonClientPreviewCleanupParams): Promise<{ ok: true }> {
    const preview = this.previewHandles.get(params.previewId);
    this.previewHandles.delete(params.previewId);
    await preview?.cleanup();
    return { ok: true };
  }

  private saveActiveChatId(chatId: string): Thenable<void> {
    return this.context.workspaceState.update(DAEMON_RUNTIME_ACTIVE_CHAT_ID_KEY, chatId);
  }
}

function getWorkspaceRoot(): string {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    throw new Error('Open a VS Code workspace folder before using the AIST daemon runtime.');
  }
  return folder.uri.fsPath;
}
