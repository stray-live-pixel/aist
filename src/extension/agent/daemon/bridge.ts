import * as vscode from 'vscode';

import type {
  DaemonEvent,
  DaemonIsolationEvent,
  IsolationFlowModeSummary,
  IsolationRemoteServerInput,
  IsolationRemoteServerSettings,
  IsolationRunnerSummary,
  IsolationSessionSummary
} from '../../../cli/daemonProtocol';
import type {
  AgentAttachment,
  ChatModelSettings,
  ModelProvider,
  OpenRouterModelOption,
  SubagentRun,
  ToolApprovalDecision
} from '../../../core/shared/types/types';
import type { Chat } from '../../chats/types';
import type { AistLogger } from '../../shared/logger';
import type { BridgeRuntimeContext, BridgeRuntimeState } from './bridge/BridgeRuntimeContext';
import { DAEMON_RUNTIME_ACTIVE_CHAT_ID_KEY } from './bridge/DAEMON_RUNTIME_ACTIVE_CHAT_ID_KEY';
import type { VscodeDaemonRuntimeBridge } from './bridge/VscodeDaemonRuntimeBridge';
import { askBridgeChat } from './bridge/askBridgeChat';
import { compactBridgeChat } from './bridge/compactBridgeChat';
import { createBridgeChat } from './bridge/createBridgeChat';
import { deleteBridgeChat } from './bridge/deleteBridgeChat';
import { disposeBridgeRuntime } from './bridge/disposeBridgeRuntime';
import { getBridgeDefaultModelSettings } from './bridge/getBridgeDefaultModelSettings';
import { getWorkspaceRoot } from './bridge/getWorkspaceRoot';
import { initializeBridgeRuntime } from './bridge/initializeBridgeRuntime';
import {
  continueBridgeIsolationSession,
  deleteBridgeIsolationRemoteServer,
  destroyBridgeIsolationSession,
  getBridgeIsolationEvents,
  startBridgeIsolationSession,
  stopBridgeIsolationSession,
  upsertBridgeIsolationRemoteServer
} from './bridge/isolationBridgeActions';
import {
  analyzeBridgeMemoryChat,
  rejectBridgeReflectionCandidate,
  saveBridgeReflectionCandidate
} from './bridge/memoryBridgeActions';
import { refreshBridgeState } from './bridge/refreshBridgeState';
import { clearBridgeChat, setBridgeModel, setBridgeModelSettings, stopBridgeChat } from './bridge/simpleChatRequests';
import { getBridgeSubagentRun, listBridgeSubagentRuns } from './bridge/subagentBridgeActions';
import { refreshBridgeModels, resolveBridgeToolCall, syncBridgeToolPermissions } from './bridge/toolBridgeActions';
import { DaemonChatStore } from './chatStore';
import { VscodeDaemonProcessManager } from './processManager';
import {
  VscodeActiveEditorContextAdapter,
  type VscodePreviewEdit,
  VscodePreviewEditAdapter,
  VscodeStatusNotificationAdapter
} from './vscodeAdapters';

export { DAEMON_RUNTIME_ACTIVE_CHAT_ID_KEY };
export type { VscodeDaemonRuntimeBridge };

/**
 * Что это: фабрика daemon runtime bridge для VS Code extension.
 * Зачем нужно: bootstrap extension создаёт process manager, bridge и регистрирует disposable в subscriptions.
 * Какую продуктовую проблему решает: daemon runtime включается одной точкой входа без знания деталей JSON-RPC.
 */
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

/**
 * Что это: thin facade над сценарными bridge-функциями.
 * Зачем нужно: публичный AgentChatStore-compatible API остаётся классом, а детали вынесены в маленькие файлы.
 * Какую продуктовую проблему решает: extension-контроллеры не меняются, но daemon bridge становится поддерживаемым.
 */
class VscodeDaemonRuntimeBridgeImpl implements VscodeDaemonRuntimeBridge {
  readonly mode = 'daemon' as const;
  readonly chats = new DaemonChatStore();
  private readonly runtimeContext: BridgeRuntimeContext;

  /** Собирает единый runtime context для всех вынесенных bridge-сценариев. */
  constructor(
    extensionContext: vscode.ExtensionContext,
    logger: AistLogger,
    readonly processManager: VscodeDaemonProcessManager,
    readonly workspaceRoot: string,
    private readonly defaultModel: string
  ) {
    this.runtimeContext = this.createRuntimeContext({ extensionContext, logger });
  }

  /** Инициализирует daemon client, state и стартовый чат. */
  initialize(): Promise<void> {
    return initializeBridgeRuntime({ context: this.runtimeContext });
  }

  /** Очищает preview handles, JSON-RPC client и process manager. */
  dispose(): void {
    disposeBridgeRuntime({ context: this.runtimeContext });
  }

  /** Создаёт persisted chat через daemon. */
  createChat(settings?: ChatModelSettings): Promise<Chat> {
    return createBridgeChat({ context: this.runtimeContext, settings: settings || this.getDefaultModelSettings() });
  }

  /** Удаляет persisted chat через daemon. */
  deleteChat(chatId: string, fallbackModel?: string): Promise<Chat> {
    return deleteBridgeChat({ context: this.runtimeContext, chatId, fallbackModel });
  }

  /** Очищает chat history/state через daemon. */
  clearChat(chatId: string): Promise<void> {
    return clearBridgeChat({ context: this.runtimeContext, chatId });
  }

  /** Меняет model id чата через daemon. */
  setModel(chatId: string, model: string): Promise<void> {
    return setBridgeModel({ context: this.runtimeContext, chatId, model });
  }

  /** Меняет model settings чата через daemon. */
  setModelSettings(chatId: string, settings: Partial<ChatModelSettings>): Promise<void> {
    return setBridgeModelSettings({ context: this.runtimeContext, chatId, settings });
  }

  /** Отправляет prompt в daemon runtime. */
  ask(
    chatId: string,
    prompt: string,
    options?: { skipUserMessage?: boolean; attachments?: AgentAttachment[] }
  ): Promise<void> {
    return askBridgeChat({ context: this.runtimeContext, chatId, prompt, options });
  }

  /** Останавливает daemon runtime для конкретного или активного чата. */
  stop(chatId?: string): Promise<void> {
    return stopBridgeChat({ context: this.runtimeContext, chatId });
  }

  /** Запускает compaction и активирует compacted chat. */
  compactChat(chatId: string, _trigger: 'manual' | 'auto'): Promise<{ id: string }> {
    return compactBridgeChat({ context: this.runtimeContext, chatId });
  }

  /** Запускает memory analysis для чата. */
  analyzeMemoryChat(chatId: string): Promise<void> {
    return analyzeBridgeMemoryChat({ context: this.runtimeContext, chatId });
  }

  /** Сохраняет reflection candidate в память. */
  saveReflectionCandidate(chatId: string, candidateId: string): Promise<void> {
    return saveBridgeReflectionCandidate({ context: this.runtimeContext, chatId, candidateId });
  }

  /** Отклоняет reflection candidate. */
  rejectReflectionCandidate(chatId: string, candidateId: string): Promise<void> {
    return rejectBridgeReflectionCandidate({ context: this.runtimeContext, chatId, candidateId });
  }

  /** Возвращает subagent runs для parent chat. */
  listSubagentRuns(parentChatId: string): Promise<readonly SubagentRun[]> {
    return listBridgeSubagentRuns({ context: this.runtimeContext, parentChatId });
  }

  /** Возвращает subagent run по id. */
  getSubagentRun(runId: string): Promise<SubagentRun | undefined> {
    return getBridgeSubagentRun({ context: this.runtimeContext, runId });
  }

  /** Возвращает сохранённые isolated sessions из последнего daemon state. */
  listIsolationFlowModes(): readonly IsolationFlowModeSummary[] {
    return this.runtimeContext.state.isolationFlowModes;
  }

  /** Возвращает сохранённые isolated sessions из последнего daemon state. */
  listIsolationSessions(): readonly IsolationSessionSummary[] {
    return this.runtimeContext.state.isolationSessions;
  }

  /** Возвращает варианты запуска isolated agents из последнего daemon state. */
  listIsolationRunners(): readonly IsolationRunnerSummary[] {
    return this.runtimeContext.state.isolationRunners;
  }

  /** Возвращает глобальные SSH-серверы isolated agents из последнего daemon state. */
  listIsolationRemoteServers(): readonly IsolationRemoteServerSettings[] {
    return this.runtimeContext.state.isolationRemoteServers;
  }

  /** Возвращает event-log isolated session из daemon storage. */
  getIsolationEvents(sessionId: string): Promise<readonly DaemonIsolationEvent[]> {
    return getBridgeIsolationEvents({ context: this.runtimeContext, sessionId });
  }

  /** Сохраняет глобальный SSH-сервер isolated agents через daemon. */
  upsertIsolationRemoteServer(server: IsolationRemoteServerInput): Promise<IsolationRemoteServerSettings> {
    return upsertBridgeIsolationRemoteServer({ context: this.runtimeContext, server });
  }

  /** Удаляет глобальный SSH-сервер isolated agents через daemon. */
  deleteIsolationRemoteServer(serverId: string): Promise<boolean> {
    return deleteBridgeIsolationRemoteServer({ context: this.runtimeContext, serverId });
  }

  /** Стартует detached isolated session через daemon. */
  startIsolationSession(
    prompt: string,
    flowId?: string,
    runner?: { provider?: 'docker-local' | 'remote-server'; runnerId?: string }
  ): Promise<IsolationSessionSummary> {
    return startBridgeIsolationSession({ context: this.runtimeContext, prompt, flowId, runner });
  }

  /** Продолжает detached isolated session в той же ветке/сессии. */
  continueIsolationSession(sessionId: string, prompt: string, flowId?: string): Promise<IsolationSessionSummary> {
    return continueBridgeIsolationSession({ context: this.runtimeContext, sessionId, prompt, flowId });
  }

  /** Останавливает isolated session/container через daemon. */
  stopIsolationSession(sessionId: string): Promise<IsolationSessionSummary | null> {
    return stopBridgeIsolationSession({ context: this.runtimeContext, sessionId });
  }

  /** Уничтожает isolated session/container через daemon. */
  destroyIsolationSession(sessionId: string): Promise<IsolationSessionSummary | null> {
    return destroyBridgeIsolationSession({ context: this.runtimeContext, sessionId });
  }

  /** Разрешает tool approval в daemon. */
  resolveToolCall(messageId: string, decision: ToolApprovalDecision): Promise<void> {
    return resolveBridgeToolCall({ context: this.runtimeContext, messageId, decision });
  }

  /** Синхронизирует tool permissions в daemon. */
  syncToolPermissions(): Promise<void> {
    return syncBridgeToolPermissions({ context: this.runtimeContext });
  }

  /** Обновляет список моделей daemon/provider. */
  refreshModels(force?: boolean, provider?: ModelProvider | 'all'): Promise<readonly OpenRouterModelOption[]> {
    return refreshBridgeModels({ context: this.runtimeContext, force, provider });
  }

  /** Обновляет полный daemon state. */
  refreshState(): Promise<void> {
    return refreshBridgeState({ context: this.runtimeContext });
  }

  /** Подписывает controller на daemon events после refresh store. */
  onEvent(listener: (event: DaemonEvent) => void): () => void {
    this.runtimeContext.state.eventListeners.add(listener);
    return () => this.runtimeContext.state.eventListeners.delete(listener);
  }

  /** Подписывает controller на daemon events до refresh store для раннего patch suppression. */
  onBeforeStoreRefresh(listener: (event: DaemonEvent) => void): () => void {
    this.runtimeContext.state.beforeStoreRefreshListeners.add(listener);
    return () => this.runtimeContext.state.beforeStoreRefreshListeners.delete(listener);
  }

  /** Возвращает default settings с fallback model. */
  private getDefaultModelSettings(): ChatModelSettings {
    return getBridgeDefaultModelSettings({ context: this.runtimeContext });
  }

  /** Создаёт общий context и mutable state для сценарных функций. */
  private createRuntimeContext({
    extensionContext,
    logger
  }: {
    extensionContext: vscode.ExtensionContext;
    logger: AistLogger;
  }): BridgeRuntimeContext {
    const state: BridgeRuntimeState = {
      client: undefined,
      eventListeners: new Set<(event: DaemonEvent) => void>(),
      beforeStoreRefreshListeners: new Set<(event: DaemonEvent) => void>(),
      isolationFlowModes: [],
      isolationSessions: [],
      isolationRunners: [],
      isolationRemoteServers: [],
      subagentRunsByParentChat: new Map<string, SubagentRun[]>(),
      lastSyncedSettings: '',
      refreshQueue: Promise.resolve(),
      refreshQueuesByChatId: new Map<string, Promise<void>>(),
      pendingChatRefreshes: new Set<string>(),
      disposed: false,
      previewHandles: new Map<string, VscodePreviewEdit>(),
      agentRequestStartedAtByRunId: new Map()
    };

    return {
      extensionContext,
      logger,
      processManager: this.processManager,
      workspaceRoot: this.workspaceRoot,
      defaultModel: this.defaultModel,
      chats: this.chats,
      activeEditorContextProvider: new VscodeActiveEditorContextAdapter(),
      previewEditProvider: new VscodePreviewEditAdapter(),
      notifier: new VscodeStatusNotificationAdapter(),
      state
    };
  }
}
