import type * as vscode from 'vscode';

import type {
  DaemonEvent,
  DaemonIsolationEvent,
  IsolationFlowModeSummary,
  IsolationRemoteServerInput,
  IsolationRemoteServerSettings,
  IsolationRunnerSummary,
  IsolationSessionSummary
} from '../../../../cli/daemonProtocol';
import type {
  AgentAttachment,
  ChatModelSettings,
  ModelProvider,
  OpenRouterModelOption,
  SubagentRun,
  ToolApprovalDecision
} from '../../../../core/shared/types/types';
import type { AgentChatStore } from '../../../chats/chatDataStore';
import type { Chat } from '../../../chats/types';
import type { VscodeDaemonProcessManager } from '../processManager';

/**
 * Что это: публичный контракт runtime bridge между VS Code extension и daemon.
 * Зачем нужно: AgentController и AutonomousController работают с daemon через стабильный API.
 * Какую продуктовую проблему решает: UI не знает деталей JSON-RPC, socket lifecycle и daemon protocol.
 */
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
  ask(
    chatId: string,
    prompt: string,
    options?: { skipUserMessage?: boolean; attachments?: AgentAttachment[] }
  ): Promise<void>;
  stop(chatId?: string): Promise<void>;
  compactChat(chatId: string, trigger: 'manual' | 'auto'): Promise<{ id: string }>;
  analyzeMemoryChat(chatId: string): Promise<void>;
  saveReflectionCandidate(chatId: string, candidateId: string): Promise<void>;
  rejectReflectionCandidate(chatId: string, candidateId: string): Promise<void>;
  listSubagentRuns(parentChatId: string): Promise<readonly SubagentRun[]>;
  getSubagentRun(runId: string): Promise<SubagentRun | undefined>;
  listIsolationFlowModes(): readonly IsolationFlowModeSummary[];
  listIsolationSessions(): readonly IsolationSessionSummary[];
  listIsolationRunners(): readonly IsolationRunnerSummary[];
  listIsolationRemoteServers(): readonly IsolationRemoteServerSettings[];
  getIsolationEvents(sessionId: string): Promise<readonly DaemonIsolationEvent[]>;
  upsertIsolationRemoteServer(server: IsolationRemoteServerInput): Promise<IsolationRemoteServerSettings>;
  deleteIsolationRemoteServer(serverId: string): Promise<boolean>;
  startIsolationSession(
    prompt: string,
    flowId?: string,
    runner?: { provider?: 'docker-local' | 'remote-server'; runnerId?: string }
  ): Promise<IsolationSessionSummary>;
  continueIsolationSession(sessionId: string, prompt: string, flowId?: string): Promise<IsolationSessionSummary>;
  stopIsolationSession(sessionId: string): Promise<IsolationSessionSummary | null>;
  destroyIsolationSession(sessionId: string): Promise<IsolationSessionSummary | null>;
  resolveToolCall(messageId: string, decision: ToolApprovalDecision): Promise<void>;
  syncToolPermissions(): Promise<void>;
  refreshModels(force?: boolean, provider?: ModelProvider | 'all'): Promise<readonly OpenRouterModelOption[]>;
  refreshState(): Promise<void>;
  onEvent(listener: (event: DaemonEvent) => void): () => void;
  onBeforeStoreRefresh(listener: (event: DaemonEvent) => void): () => void;
};
