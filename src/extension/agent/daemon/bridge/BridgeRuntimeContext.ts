import type * as vscode from 'vscode';

import type { DaemonJsonRpcClient } from '../../../../cli/daemonClient';
import type {
  DaemonEvent,
  IsolationFlowModeSummary,
  IsolationRemoteServerSettings,
  IsolationRunnerSummary,
  IsolationSessionSummary
} from '../../../../cli/daemonProtocol';
import type { PerformanceTelemetryRecord } from '../../../../core/features/performanceTelemetry';
import type { SubagentRun } from '../../../../core/shared/types/types';
import type { AistLogger } from '../../../shared/logger';
import type { DaemonChatStore } from '../chatStore';
import type { VscodeDaemonProcessManager } from '../processManager';
import type {
  VscodeActiveEditorContextAdapter,
  VscodePreviewEdit,
  VscodePreviewEditAdapter,
  VscodeStatusNotificationAdapter
} from '../vscodeAdapters';

/**
 * Что это: mutable-состояние daemon bridge.
 * Зачем нужно: вынесенные сценарии работают с одним client, queue, preview handles и caches.
 * Какую продуктовую проблему решает: декомпозиция bridge не создаёт конкурирующие источники правды.
 */
export type BridgeRuntimeState = {
  client: DaemonJsonRpcClient | undefined;
  eventListeners: Set<(event: DaemonEvent) => void>;
  beforeStoreRefreshListeners: Set<(event: DaemonEvent) => void>;
  isolationFlowModes: IsolationFlowModeSummary[];
  isolationSessions: IsolationSessionSummary[];
  isolationRunners: IsolationRunnerSummary[];
  isolationRemoteServers: IsolationRemoteServerSettings[];
  subagentRunsByParentChat: Map<string, SubagentRun[]>;
  lastSyncedSettings: string;
  refreshQueue: Promise<void>;
  refreshQueuesByChatId: Map<string, Promise<void>>;
  pendingChatRefreshes: Set<string>;
  disposed: boolean;
  previewHandles: Map<string, VscodePreviewEdit>;
  agentRequestStartedAtByRunId: Map<
    string,
    Pick<PerformanceTelemetryRecord, 'startedAt' | 'chatId' | 'extensionVersion' | 'workspaceRoot'>
  >;
};

/**
 * Что это: общий контекст bridge-сценариев.
 * Зачем нужно: functions получают VS Code services, daemon client manager и chat store без большого класса.
 * Какую продуктовую проблему решает: JSON-RPC, webview state и VS Code adapters остаются связаны в одном runtime.
 */
export type BridgeRuntimeContext = {
  extensionContext: vscode.ExtensionContext;
  logger: AistLogger;
  processManager: VscodeDaemonProcessManager;
  workspaceRoot: string;
  defaultModel: string;
  chats: DaemonChatStore;
  activeEditorContextProvider: VscodeActiveEditorContextAdapter;
  previewEditProvider: VscodePreviewEditAdapter;
  notifier: VscodeStatusNotificationAdapter;
  state: BridgeRuntimeState;
};
