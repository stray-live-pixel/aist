import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

import {
  type ConfigScope,
  FileBackedConfigStore,
  FileSecretStore,
  OPENROUTER_API_KEY_SECRET_KEY
} from '../core/app/config/config';
import {
  type AgentRuntimeChatRepository,
  type AgentRuntimeConfigSnapshot,
  AgentRuntimeService,
  type AgentRuntimeToolCallHandler
} from '../core/app/runtime/agentRuntime';
import { ChatRepository } from '../core/entities/chat/chatRepository';
import { type AgentMemoryScope, AgentMemoryStore, createMemoryStorePaths } from '../core/entities/memory/memory';
import { type AuxiliaryModelInvoker, createAuxiliaryModelInvoker } from '../core/entities/model/auxiliaryModel';
import { CodexAuthSessionProvider } from '../core/entities/model/codexAuth';
import { CodexResponsesTransport } from '../core/entities/model/codexTransport';
import { DEFAULT_MODEL, FALLBACK_MODEL_OPTIONS } from '../core/entities/model/modelDefaults';
import type { FetchLike, ModelClient } from '../core/entities/model/modelTransport';
import { normalizeProviderProfiles } from '../core/entities/model/normalizeProviderProfiles';
import { OpenRouterTransport } from '../core/entities/model/openrouterTransport';
import type { ProviderProfile } from '../core/entities/model/providerProfile';
import { RunRepository } from '../core/entities/run/runRepository';
import {
  globalSettingsFile,
  globalWorkspaceRoot,
  safeMkdir,
  workspaceAistRoot,
  workspaceSettingsFile
} from '../core/entities/storage/storage';
import { SubagentRepository } from '../core/entities/subagent/subagentRepository';
import { getToolExecutionRequirement, normalizeToolApprovalDecision } from '../core/features/approval/approvalProtocol';
import {
  createCompactionMessages,
  selectCompactionTailMessages,
  splitCompactionHistory
} from '../core/features/compaction/compaction';
import { analyzeMemoryChatDetailed, getRelevantMemoryPromptBlockBySubagent } from '../core/features/memory-subagent';
import { validateReflectionCandidates } from '../core/features/reflection/reflection';
import { type AgentSkill, runNodeSkillTool } from '../core/features/skills/skills';
import { buildFileAgentSystemPrompt } from '../core/features/system-prompt/filePromptConfig';
import { type AgentLanguage } from '../core/features/system-prompt/prompts';
import { DefaultToolRegistry, type ToolRegistry } from '../core/features/tool-execution/toolRegistry';
import {
  type ToolExecutionPreview,
  ToolRunner,
  type ToolRunnerExecutionAdapter
} from '../core/features/tool-execution/toolRunner';
import {
  AutonomousBackend,
  type AutonomousExportFormat,
  type AutonomousLaunchOptions
} from '../core/processes/autonomous';
import { getRepoVerificationContextNote } from '../core/shared/lib/repoMap';
import type { EditorContextInput } from '../core/shared/types/types';
import type {
  Chat,
  ChatModelSettings,
  CodexServiceTier,
  EditorContextMode,
  JsonObject,
  JsonValue,
  ModelProvider,
  OpenRouterModelOption,
  ReasoningEffort,
  RuntimeEvent,
  ToolApprovalDecision,
  ToolPermissionMode
} from '../core/shared/types/types';
import { createNodeFilesystemToolRunner } from '../core/tools/fs/node_filesystem_tools/nodeFilesystemTools';
import {
  DAEMON_BUSY_ERROR_CODE,
  DAEMON_EVENT_METHOD,
  DAEMON_PROTOCOL_VERSION,
  type DaemonActiveRun,
  type DaemonApprovalResolveParams,
  type DaemonApprovalResolveResult,
  type DaemonAutonomousExportResult,
  type DaemonAutonomousStartResult,
  type DaemonAutonomousStateResult,
  type DaemonAutonomousStopResult,
  type DaemonChat,
  type DaemonChatAskResult,
  type DaemonChatClearResult,
  type DaemonChatCompactResult,
  type DaemonChatCreateResult,
  type DaemonChatDeleteResult,
  type DaemonChatGetResult,
  type DaemonChatListResult,
  type DaemonChatMemoryAnalyzeResult,
  type DaemonChatReflectionCandidateRejectResult,
  type DaemonChatReflectionCandidateSaveResult,
  type DaemonChatSetModelResult,
  type DaemonChatSetModelSettingsResult,
  type DaemonChatStopResult,
  type DaemonClientCapabilities,
  type DaemonClientCapabilitiesResult,
  type DaemonClientPreviewPrepareResult,
  type DaemonConfigGetResult,
  type DaemonConfigUpdateResult,
  type DaemonEvent,
  type DaemonEventsSubscribeResult,
  type DaemonInitializeResult,
  type DaemonModelsResult,
  type DaemonState,
  type DaemonSubagentGetResult,
  type DaemonSubagentListResult,
  type JsonRpcErrorObject,
  type JsonRpcId,
  type JsonRpcRequest,
  type JsonRpcResponse,
  getDaemonSocketPath
} from './daemonProtocol';

export type AistDaemonServerOptions = {
  readonly workspaceRoot: string;
  readonly homeDir?: string;
  readonly env?: Record<string, string | undefined>;
  readonly socketPath?: string;
  readonly fetch?: FetchLike;
  readonly modelClient?: ModelClient;
  readonly toolRegistry?: ToolRegistry;
  readonly filesystemToolRunner?: ToolRunnerExecutionAdapter;
  readonly now?: () => number;
  readonly idFactory?: () => string;
};

type DaemonConnection = {
  readonly socket: net.Socket;
  buffer: string;
  subscribed: boolean;
  capabilities: DaemonClientCapabilities;
  pendingClientRequests: Map<
    string,
    {
      resolve(value: unknown): void;
      reject(error: unknown): void;
      timeout: NodeJS.Timeout;
    }
  >;
};

type PendingApproval = {
  readonly approvalId: string;
  readonly messageId: string;
  readonly runId: string;
  readonly chatId: string;
};

type RedactedConfigValue = {
  readonly value: JsonValue | undefined;
  readonly redacted: boolean;
};

const OPENROUTER_ENV_KEY = 'OPENROUTER_API_KEY';
const E2E_OPENROUTER_ENDPOINT_ENV_KEY = 'AIST_E2E_OPENROUTER_ENDPOINT';
const REDACTED_VALUE = '<redacted>';
const READONLY_DAEMON_TOOLS = new Set([
  'get_workspace_info',
  'list_files',
  'read_file',
  'read_file_range',
  'grep_search',
  'set_plan_item_status'
]);

const unusedFetch: FetchLike = async () => {
  throw new Error('Unexpected network request while listing static model options.');
};

export class AistDaemonServer {
  readonly workspaceRoot: string;
  readonly homeDir: string;
  readonly socketPath: string;
  readonly logFilePath: string;

  private readonly env: Record<string, string | undefined>;
  private readonly now: () => number;
  private readonly idFactory: () => string;
  private readonly logger: DaemonFileLogger;
  private readonly chatRepository: ChatRepository;
  private readonly runRepository: RunRepository;
  private readonly subagentRepository: SubagentRepository;
  private readonly configStore: FileBackedConfigStore;
  private readonly memoryStore: AgentMemoryStore;
  private readonly toolRegistry: ToolRegistry;
  private readonly runtime: AgentRuntimeService;
  private readonly autonomousBackend: AutonomousBackend;
  private readonly auxiliaryModel: AuxiliaryModelInvoker;
  private readonly connections = new Set<DaemonConnection>();
  private readonly pendingApprovalsById = new Map<string, PendingApproval>();
  private readonly pendingApprovalsByMessageId = new Map<string, PendingApproval>();

  private server: net.Server | undefined;
  private readonly activeRunsById = new Map<string, DaemonActiveRun>();
  private readonly activeRunsByChat = new Map<string, DaemonActiveRun>();
  private readonly startingRunsByChat = new Set<string>();
  private nextClientRequestId = 1;
  private cachedToolPermissions: Record<string, ToolPermissionMode> = {};

  constructor(private readonly options: AistDaemonServerOptions) {
    this.workspaceRoot = path.resolve(options.workspaceRoot);
    this.homeDir = options.homeDir || os.homedir();
    this.env = options.env || process.env;
    this.now = options.now || Date.now;
    this.idFactory = options.idFactory || randomUUID;
    this.socketPath = options.socketPath || getDaemonSocketPath(this.workspaceRoot);
    this.logFilePath = path.join(globalWorkspaceRoot(this.workspaceRoot, this.homeDir), 'daemon.log');
    this.logger = new DaemonFileLogger(this.logFilePath);
    this.chatRepository = new ChatRepository({ workspaceRoot: this.workspaceRoot, homeDir: this.homeDir });
    this.runRepository = new RunRepository({ workspaceRoot: this.workspaceRoot, homeDir: this.homeDir });
    this.subagentRepository = new SubagentRepository({
      workspaceRoot: this.workspaceRoot,
      homeDir: this.homeDir,
      idFactory: this.idFactory,
      now: this.now
    });
    this.configStore = new FileBackedConfigStore({
      workspaceRoot: this.workspaceRoot,
      homeDir: this.homeDir,
      logger: this.logger
    });
    this.memoryStore = new AgentMemoryStore(
      createMemoryStorePaths({ workspaceRoot: this.workspaceRoot, homeDir: this.homeDir })
    );
    this.toolRegistry = options.toolRegistry || new DefaultToolRegistry();
    this.auxiliaryModel = this.createAuxiliaryModelInvoker();
    this.runtime = this.createRuntime();
    this.autonomousBackend = new AutonomousBackend({
      workspaceRoot: this.workspaceRoot,
      homeDir: this.homeDir,
      env: this.env,
      fetch: this.options.fetch,
      modelClient: this.options.modelClient,
      logger: this.logger,
      now: this.now,
      idFactory: this.idFactory
    });
    this.autonomousBackend.onEvent((event) => this.broadcastEvent(event));
  }

  async start(): Promise<void> {
    await this.initializeWorkspace();
    await prepareSocketPath(this.socketPath);

    this.server = net.createServer((socket) => this.acceptConnection(socket));
    this.server.on('error', (error) => this.logger.error('Daemon server error', error));

    await new Promise<void>((resolve, reject) => {
      this.server!.once('error', reject);
      this.server!.listen(this.socketPath, () => {
        this.server!.off('error', reject);
        resolve();
      });
    });

    this.logger.info('Daemon started', {
      workspaceRoot: this.workspaceRoot,
      socketPath: this.socketPath
    });
  }

  async close(): Promise<void> {
    for (const connection of [...this.connections]) {
      connection.socket.destroy();
    }
    this.connections.clear();

    if (this.server) {
      await new Promise<void>((resolve, reject) => {
        this.server!.close((error) => (error ? reject(error) : resolve()));
      }).catch(() => undefined);
      this.server = undefined;
    }

    if (process.platform !== 'win32') {
      await fs.promises.rm(this.socketPath, { force: true }).catch(() => undefined);
    }

    this.autonomousBackend.dispose();
  }

  getState(): Promise<DaemonState> {
    return this.readState();
  }

  private async initializeWorkspace(): Promise<void> {
    const stat = await fs.promises.stat(this.workspaceRoot).catch(() => undefined);
    if (!stat?.isDirectory()) {
      throw new DaemonRpcError(-32000, 'workspace.invalid', `Workspace path is not accessible: ${this.workspaceRoot}`, {
        workspaceRoot: this.workspaceRoot
      });
    }

    await safeMkdir(workspaceAistRoot(this.workspaceRoot));
    await this.resetStaleRuntimeState();
  }

  private acceptConnection(socket: net.Socket): void {
    const connection: DaemonConnection = {
      socket,
      buffer: '',
      subscribed: false,
      capabilities: {},
      pendingClientRequests: new Map()
    };
    this.connections.add(connection);
    socket.setEncoding('utf8');
    socket.on('data', (chunk) => this.handleConnectionData(connection, chunk));
    socket.on('error', (error) => this.logger.warn('Daemon client socket error', sanitizeLogDetails(error)));
    socket.on('close', () => {
      this.rejectPendingClientRequests(connection, new Error('Daemon client disconnected.'));
      this.connections.delete(connection);
    });
  }

  private handleConnectionData(connection: DaemonConnection, chunk: string | Buffer): void {
    connection.buffer += chunk.toString();
    while (true) {
      const newlineIndex = connection.buffer.indexOf('\n');
      if (newlineIndex === -1) {
        return;
      }

      const line = connection.buffer.slice(0, newlineIndex).trim();
      connection.buffer = connection.buffer.slice(newlineIndex + 1);
      if (line) {
        void this.handleConnectionLine(connection, line);
      }
    }
  }

  private async handleConnectionLine(connection: DaemonConnection, line: string): Promise<void> {
    let message: unknown;
    try {
      message = JSON.parse(line) as unknown;
    } catch {
      this.sendError(connection, null, createJsonRpcError(-32700, 'parse.error', 'Parse error.'));
      return;
    }

    if (isJsonRpcResponse(message)) {
      this.handleClientResponse(connection, message);
      return;
    }

    const request = message as JsonRpcRequest;

    const id = request.id ?? null;
    if (!isValidJsonRpcRequest(request)) {
      this.sendError(connection, id, createJsonRpcError(-32600, 'request.invalid', 'Invalid JSON-RPC request.'));
      return;
    }

    try {
      const result = await this.dispatch(connection, request.method, request.params);
      if (request.id !== undefined) {
        this.sendResult(connection, request.id, result);
      }
    } catch (error) {
      this.logger.warn('Daemon request failed', {
        method: request.method,
        error: error instanceof Error ? error.message : String(error)
      });
      if (request.id !== undefined) {
        this.sendError(connection, request.id, toJsonRpcError(error));
      }
    }
  }

  private dispatch(connection: DaemonConnection, method: string, params: unknown): Promise<unknown> {
    switch (method) {
      case 'initialize':
        return this.initializeMethod();
      case 'state.get':
        return this.stateGet();
      case 'events.subscribe':
        return this.eventsSubscribe(connection, true);
      case 'events.unsubscribe':
        return this.eventsSubscribe(connection, false);
      case 'client.capabilities':
        return this.clientCapabilities(connection, params);
      case 'chat.create':
        return this.chatCreate(params);
      case 'chat.list':
        return this.chatList();
      case 'chat.get':
        return this.chatGet(params);
      case 'chat.ask':
        return this.chatAsk(params);
      case 'chat.stop':
        return this.chatStop(params);
      case 'chat.delete':
        return this.chatDelete(params);
      case 'chat.clear':
        return this.chatClear(params);
      case 'chat.setModel':
        return this.chatSetModel(params);
      case 'chat.setModelSettings':
        return this.chatSetModelSettings(params);
      case 'chat.compact':
        return this.chatCompact(params);
      case 'chat.memoryAnalyze':
        return this.chatMemoryAnalyze(params);
      case 'chat.reflectionCandidate.save':
        return this.chatReflectionCandidateSave(params);
      case 'chat.reflectionCandidate.reject':
        return this.chatReflectionCandidateReject(params);
      case 'subagent.get':
        return this.subagentGet(params);
      case 'subagent.list':
        return this.subagentList(params);
      case 'approval.resolve':
        return this.approvalResolve(params);
      case 'config.get':
        return this.configGet(params);
      case 'config.update':
        return this.configUpdate(params);
      case 'models.list':
        return this.modelsList(params, false);
      case 'models.refresh':
        return this.modelsList(params, true);
      case 'autonomous.state':
        return this.autonomousState();
      case 'autonomous.flow.start':
        return this.autonomousFlowStart(params);
      case 'autonomous.run.start':
        return this.autonomousRunStart(params);
      case 'autonomous.stop':
        return this.autonomousStop(params);
      case 'autonomous.export':
        return this.autonomousExport(params);
      default:
        throw new DaemonRpcError(-32601, 'method.notFound', `Method not found: ${method}`);
    }
  }

  private async initializeMethod(): Promise<DaemonInitializeResult> {
    await this.initializeWorkspace();
    return {
      operationId: this.idFactory(),
      state: await this.readState()
    };
  }

  private async stateGet(): Promise<DaemonState> {
    return this.readState();
  }

  private async eventsSubscribe(
    connection: DaemonConnection,
    subscribed: boolean
  ): Promise<DaemonEventsSubscribeResult> {
    connection.subscribed = subscribed;
    return {
      operationId: this.idFactory(),
      subscribed
    };
  }

  private async clientCapabilities(
    connection: DaemonConnection,
    params: unknown
  ): Promise<DaemonClientCapabilitiesResult> {
    const input = asOptionalRecord(params);
    const capabilitiesInput = asOptionalRecord(input.capabilities);
    connection.capabilities = {
      activeEditorContext: capabilitiesInput.activeEditorContext === true,
      notifications: capabilitiesInput.notifications === true,
      openWorkspaceFile: capabilitiesInput.openWorkspaceFile === true,
      vscodeEditableDiffPreview: capabilitiesInput.vscodeEditableDiffPreview === true
    };
    return {
      operationId: this.idFactory(),
      capabilities: connection.capabilities
    };
  }

  private async chatCreate(params: unknown): Promise<DaemonChatCreateResult> {
    const input = asOptionalRecord(params);
    const fallbackSettings = await this.getDefaultChatModelSettings();
    const model = optionalString(input, 'model') || fallbackSettings.model;
    const modelSettings = normalizeChatModelSettings(input.modelSettings, { ...fallbackSettings, model });
    const chat = await this.chatRepository.create({ model: modelSettings.model, modelSettings });
    await this.broadcastStateChanged('chat.create');
    return {
      operationId: this.idFactory(),
      chat: toDaemonChat(chat)
    };
  }

  private async chatList(): Promise<DaemonChatListResult> {
    return {
      operationId: this.idFactory(),
      chats: await this.chatRepository.list()
    };
  }

  private async chatGet(params: unknown): Promise<DaemonChatGetResult> {
    const input = requireRecord(params, 'chat.get params');
    const chat = await this.requireChat(requireString(input, 'chatId'));
    return {
      operationId: this.idFactory(),
      chat: toDaemonChat(chat)
    };
  }

  private async chatAsk(params: unknown): Promise<DaemonChatAskResult> {
    const input = requireRecord(params, 'chat.ask params');
    const chatId = requireString(input, 'chatId');
    const prompt = requireString(input, 'prompt');
    const skipUserMessage = input.skipUserMessage === true;
    await this.requireChat(chatId);
    if (this.activeRunsByChat.has(chatId) || this.startingRunsByChat.has(chatId)) {
      throw this.createBusyError(chatId);
    }

    this.startingRunsByChat.add(chatId);
    try {
      const result = await this.runtime.startAsk(chatId, prompt, { skipUserMessage });
      if (!result.accepted) {
        throw new DaemonRpcError(-32000, result.error.code || 'run.rejected', result.error.message, {
          code: result.error.code || 'run.rejected',
          chatId
        });
      }

      this.registerActiveRun({ runId: result.runId, chatId });
      await this.broadcastStateChanged('chat.ask');
      return {
        operationId: this.idFactory(),
        runId: result.runId,
        chatId,
        accepted: true
      };
    } finally {
      this.startingRunsByChat.delete(chatId);
    }
  }

  private async chatStop(params: unknown): Promise<DaemonChatStopResult> {
    const input = asOptionalRecord(params);
    const requestedRunId = optionalString(input, 'runId');
    const requestedChatId = optionalString(input, 'chatId');
    const activeRun = requestedRunId
      ? this.activeRunsById.get(requestedRunId)
      : requestedChatId
        ? this.activeRunsByChat.get(requestedChatId)
        : this.getActiveRuns()[0];
    const runId = activeRun?.runId || requestedRunId;
    const stopped = Boolean(activeRun);
    if (activeRun) {
      this.runtime.stop(activeRun.runId);
    }

    await this.broadcastStateChanged('chat.stop');
    return {
      operationId: this.idFactory(),
      stopped,
      runId
    };
  }

  private async chatDelete(params: unknown): Promise<DaemonChatDeleteResult> {
    const input = requireRecord(params, 'chat.delete params');
    const chatId = requireString(input, 'chatId');
    const chat = await this.requireChat(chatId);
    if (chat.busy || this.activeRunsByChat.has(chat.id)) {
      throw this.createBusyError();
    }

    await this.chatRepository.delete(chat.id);
    const nextChatId = (await this.chatRepository.list())[0]?.id;
    await this.broadcastStateChanged('chat.delete');
    return {
      operationId: this.idFactory(),
      deleted: true,
      nextChatId
    };
  }

  private async chatClear(params: unknown): Promise<DaemonChatClearResult> {
    const input = requireRecord(params, 'chat.clear params');
    const chat = await this.requireChat(requireString(input, 'chatId'));
    if (chat.busy || this.activeRunsByChat.has(chat.id)) {
      throw this.createBusyError();
    }

    const cleared = await this.chatRepository.clear(chat.id);
    await this.broadcastStateChanged('chat.clear');
    return {
      operationId: this.idFactory(),
      chat: toDaemonChat(cleared)
    };
  }

  private async chatSetModel(params: unknown): Promise<DaemonChatSetModelResult> {
    const input = requireRecord(params, 'chat.setModel params');
    const chatId = requireString(input, 'chatId');
    const model = requireString(input, 'model');
    const chat = await this.requireChat(chatId);
    if (chat.busy || this.activeRunsByChat.has(chat.id)) {
      throw this.createBusyError();
    }

    const modelSettings = normalizeChatModelSettings({ ...chat.modelSettings, model }, chat.modelSettings);
    const updated = await this.chatRepository.update(chat.id, { model, modelSettings });
    await this.broadcastStateChanged('chat.setModel');
    return {
      operationId: this.idFactory(),
      chat: toDaemonChat(updated)
    };
  }

  private async chatSetModelSettings(params: unknown): Promise<DaemonChatSetModelSettingsResult> {
    const input = requireRecord(params, 'chat.setModelSettings params');
    const chatId = requireString(input, 'chatId');
    const settingsInput = asOptionalRecord(input.settings);
    const chat = await this.requireChat(chatId);
    if (chat.busy || this.activeRunsByChat.has(chat.id)) {
      throw this.createBusyError();
    }

    const modelSettings = normalizeChatModelSettings({ ...chat.modelSettings, ...settingsInput }, chat.modelSettings);
    const updated = await this.chatRepository.update(chat.id, { model: modelSettings.model, modelSettings });
    await this.broadcastStateChanged('chat.setModelSettings');
    return {
      operationId: this.idFactory(),
      chat: toDaemonChat(updated)
    };
  }

  private async chatMemoryAnalyze(params: unknown): Promise<DaemonChatMemoryAnalyzeResult> {
    const input = requireRecord(params, 'chat.memoryAnalyze params');
    const chat = await this.requireChat(requireString(input, 'chatId'));
    const settings = await this.getMemorySubagentSettings(chat.model);
    const modelClient = this.options.modelClient || this.createRoutingModelClient();
    const startedAt = this.now();
    const run = await this.subagentRepository.create({
      parentChatId: chat.id,
      kind: 'memory.analysis',
      mode: 'single_model_call',
      title: 'Субагент памяти',
      status: 'running',
      model: settings.model,
      includeResultInParentModelContext: false,
      startedAt
    });
    const subagentMessage = await this.chatRepository.appendMessage(chat.id, {
      role: 'subagent',
      status: 'running',
      content: 'Субагент памяти анализирует чат.',
      subagentRunId: run.id,
      subagentKind: run.kind,
      subagent: { runId: run.id, kind: run.kind, title: run.title },
      result: { ok: true, subagentRunId: run.id, stage: 'running', candidateIds: [] }
    });

    await this.broadcastStateChanged('chat.memoryAnalyze.started');

    try {
      const analysis = await analyzeMemoryChatDetailed({
        analysis: {
          chatId: chat.id,
          messages: chat.messages,
          memoryItems: this.memoryStore.list(),
          chatModel: chat.model,
          settings
        },
        modelClient
      });
      const candidates = analysis.candidates.map((candidate) => ({
        ...candidate,
        sourceSubagentRunId: run.id
      }));
      const candidateIds = candidates.map((candidate) => candidate.id);

      if (candidates.length) {
        await this.chatRepository.addReflectionCandidates(chat.id, candidates);
      }

      const finishedAt = this.now();
      const messages = createMemorySubagentMessages({
        runId: run.id,
        parentChatId: chat.id,
        startedAt,
        finishedAt,
        candidateCount: candidates.length,
        error: analysis.error,
        responseContent: analysis.response?.content
      });
      await this.subagentRepository.update(run.id, {
        status: analysis.error ? 'error' : 'success',
        model: analysis.model,
        history: analysis.history,
        messages,
        result: { ok: !analysis.error, candidateIds, candidateCount: candidates.length },
        error: analysis.error,
        finishedAt
      });
      await this.chatRepository.updateMessage(chat.id, subagentMessage.id, {
        status: analysis.error ? 'error' : 'done',
        content: analysis.error
          ? `Субагент памяти завершился с ошибкой: ${analysis.error}`
          : formatMemorySubagentSuccessText(candidates.length),
        result: {
          ok: !analysis.error,
          subagentRunId: run.id,
          candidateIds,
          candidateCount: candidates.length,
          error: analysis.error
        }
      });

      const updatedChat = await this.requireChat(chat.id);
      await this.broadcastStateChanged('chat.memoryAnalyze');
      return {
        operationId: this.idFactory(),
        chat: toDaemonChat(updatedChat),
        candidates
      };
    } catch (error) {
      const finishedAt = this.now();
      const message = formatError(error);
      await this.subagentRepository.update(run.id, {
        status: 'error',
        messages: createMemorySubagentMessages({
          runId: run.id,
          parentChatId: chat.id,
          startedAt,
          finishedAt,
          candidateCount: 0,
          error: message
        }),
        result: { ok: false, candidateIds: [], candidateCount: 0, error: message },
        error: message,
        finishedAt
      });
      await this.chatRepository.updateMessage(chat.id, subagentMessage.id, {
        status: 'error',
        content: `Субагент памяти завершился с ошибкой: ${message}`,
        result: { ok: false, subagentRunId: run.id, candidateIds: [], candidateCount: 0, error: message }
      });
      await this.broadcastStateChanged('chat.memoryAnalyze.failed');
      throw error;
    }
  }

  /**
   * Что это: подтверждение предложения memory-субагента через daemon source of truth.
   * Зачем нужно: память пополняется только после user approval, а карточка предложения не возвращается при refresh.
   */
  private async chatReflectionCandidateSave(params: unknown): Promise<DaemonChatReflectionCandidateSaveResult> {
    const input = requireRecord(params, 'chat.reflectionCandidate.save params');
    const chatId = requireString(input, 'chatId');
    const candidateId = requireString(input, 'candidateId');
    const chat = await this.requireChat(chatId);
    const candidate = chat.reflectionCandidates?.find((item) => item.id === candidateId && item.status === 'pending');
    const validated = validateReflectionCandidates(candidate ? [candidate] : [])[0];

    if (!candidate || !validated) {
      await this.chatRepository.setReflectionCandidateStatus(chatId, candidateId, 'rejected');
      const updatedChat = await this.requireChat(chatId);
      await this.broadcastStateChanged('chat.reflectionCandidate.save.invalid');
      return {
        operationId: this.idFactory(),
        chat: toDaemonChat(updatedChat),
        candidate: undefined,
        memoryItem: undefined
      };
    }

    const memoryItem = await this.memoryStore.add({
      scope: getReflectionMemoryScope(validated),
      note: getReflectionMemoryNote(validated)
    });
    const updatedCandidate = await this.chatRepository.setReflectionCandidateStatus(chatId, candidateId, 'saved');
    const updatedChat = await this.requireChat(chatId);
    await this.broadcastStateChanged('chat.reflectionCandidate.save');

    return {
      operationId: this.idFactory(),
      chat: toDaemonChat(updatedChat),
      candidate: updatedCandidate,
      memoryItem
    };
  }

  /**
   * Что это: отклонение предложения memory-субагента через persisted chat state.
   * Зачем нужно: отказ пользователя должен переживать новые сообщения, refresh webview и перезапуск daemon.
   */
  private async chatReflectionCandidateReject(params: unknown): Promise<DaemonChatReflectionCandidateRejectResult> {
    const input = requireRecord(params, 'chat.reflectionCandidate.reject params');
    const chatId = requireString(input, 'chatId');
    const candidateId = requireString(input, 'candidateId');
    const candidate = await this.chatRepository.setReflectionCandidateStatus(chatId, candidateId, 'rejected');
    const updatedChat = await this.requireChat(chatId);
    await this.broadcastStateChanged('chat.reflectionCandidate.reject');

    return {
      operationId: this.idFactory(),
      chat: toDaemonChat(updatedChat),
      candidate
    };
  }

  private async subagentGet(params: unknown): Promise<DaemonSubagentGetResult> {
    const input = requireRecord(params, 'subagent.get params');
    const runId = requireString(input, 'runId');
    const run = await this.subagentRepository.get(runId);
    if (!run) {
      throw new DaemonRpcError(-32000, 'subagent.notFound', `Subagent run not found: ${runId}`, { runId });
    }

    return {
      operationId: this.idFactory(),
      run
    };
  }

  private async subagentList(params: unknown): Promise<DaemonSubagentListResult> {
    const input = requireRecord(params, 'subagent.list params');
    const parentChatId = requireString(input, 'parentChatId');
    return {
      operationId: this.idFactory(),
      runs: await this.subagentRepository.list(parentChatId)
    };
  }

  private async chatCompact(params: unknown): Promise<DaemonChatCompactResult> {
    const input = requireRecord(params, 'chat.compact params');
    const chat = await this.requireChat(requireString(input, 'chatId'));
    if (chat.busy || this.activeRunsByChat.has(chat.id) || this.startingRunsByChat.has(chat.id)) {
      throw this.createBusyError();
    }

    const keepLastMessages = optionalNumber(input, 'keepLastMessages') ?? 0;
    const trigger = optionalString(input, 'trigger') || 'manual';
    const compactionMessage = await this.chatRepository.appendMessage(chat.id, {
      role: 'tool',
      name: 'compact_chat',
      status: 'running',
      reason: 'Compact the current chat context before continuing work.',
      nextStep: 'Create a concise summary and open the compacted chat copy.',
      args: {
        trigger,
        keepLastMessages,
        sourceChatId: chat.id
      }
    });
    await this.chatRepository.updateState(chat.id, {
      activity: 'thinking',
      activityDetail: 'Compacting context'
    });
    await this.broadcastStateChanged('chat.compact.started');

    try {
      const { summary, model: compactionModel } = await this.createCompactionSummary(
        chat,
        optionalString(input, 'summary'),
        keepLastMessages
      );
      const tailMessages = selectCompactionTailMessages(chat.messages, keepLastMessages);
      const { tailHistory } = splitCompactionHistory(chat.history, keepLastMessages);
      const compactedAt = this.now();
      const compacted = await this.chatRepository.create({
        title: `${chat.title} compacted`,
        model: chat.model,
        modelSettings: chat.modelSettings,
        previousChatId: chat.id,
        compactedAt,
        compactionModel,
        lastAnswer: summary,
        messages: [{ role: 'assistant', content: summary, createdAt: compactedAt }, ...tailMessages],
        history: [{ role: 'assistant', content: summary }, ...tailHistory],
        state: { busy: false }
      });
      await this.chatRepository.updateMessage(chat.id, compactionMessage.id, {
        status: 'done',
        result: {
          ok: true,
          chatId: compacted.id,
          sourceChatId: chat.id,
          compactedAt,
          compactionModel
        }
      });
      await this.chatRepository.updateState(chat.id, {
        activity: undefined,
        activityDetail: undefined
      });
      await this.broadcastStateChanged('chat.compact');
      return {
        operationId: this.idFactory(),
        chat: toDaemonChat(compacted)
      };
    } catch (error) {
      await this.chatRepository.updateMessage(chat.id, compactionMessage.id, {
        status: 'error',
        result: {
          ok: false,
          error: formatError(error)
        }
      });
      await this.chatRepository.updateState(chat.id, {
        activity: undefined,
        activityDetail: undefined
      });
      await this.broadcastStateChanged('chat.compact.failed');
      throw error;
    }
  }

  private async approvalResolve(params: unknown): Promise<DaemonApprovalResolveResult> {
    const input = requireRecord(params, 'approval.resolve params');
    const approvalId = optionalString(input, 'approvalId');
    const messageId =
      optionalString(input, 'messageId') ||
      (approvalId ? this.pendingApprovalsById.get(approvalId)?.messageId : undefined);
    if (!messageId || !this.pendingApprovalsByMessageId.has(messageId)) {
      return {
        operationId: this.idFactory(),
        resolved: false,
        approvalId,
        messageId
      };
    }

    if (!hasApprovalDecision(input)) {
      throw new DaemonRpcError(-32602, 'params.invalid', 'approval.resolve requires a decision.', {
        approvalId,
        messageId
      });
    }

    const decision = normalizeToolApprovalDecision(
      input as unknown as DaemonApprovalResolveParams
    ) satisfies ToolApprovalDecision;
    this.runtime.resolveToolCall(messageId, decision);
    const pending = this.pendingApprovalsByMessageId.get(messageId);
    if (pending) {
      this.pendingApprovalsById.delete(pending.approvalId);
      this.pendingApprovalsByMessageId.delete(messageId);
    }
    await this.broadcastStateChanged('approval.resolve');
    return {
      operationId: this.idFactory(),
      resolved: true,
      approvalId: pending?.approvalId || approvalId,
      messageId
    };
  }

  private async configGet(params: unknown): Promise<DaemonConfigGetResult> {
    const input = asOptionalRecord(params);
    const key = optionalString(input, 'key');
    const globalSettings = await readOptionalJsonObject(globalSettingsFile(this.homeDir));
    const workspaceSettings = await readOptionalJsonObject(workspaceSettingsFile(this.workspaceRoot));

    if (key) {
      const workspaceValue = getJsonPath(workspaceSettings, key);
      const globalValue = getJsonPath(globalSettings, key);
      const value = workspaceValue !== undefined ? workspaceValue : globalValue;
      const source = workspaceValue !== undefined ? 'workspace' : globalValue !== undefined ? 'global' : 'unset';
      const redacted = redactConfigValue(key, value);
      return {
        operationId: this.idFactory(),
        config: {
          key,
          value: redacted.value ?? null,
          source,
          redacted: redacted.redacted
        }
      };
    }

    const redacted = redactConfigValue('', mergeJsonObjects(globalSettings, workspaceSettings));
    return {
      operationId: this.idFactory(),
      config: {
        values: asJsonObject(redacted.value),
        redacted: redacted.redacted
      }
    };
  }

  private async configUpdate(params: unknown): Promise<DaemonConfigUpdateResult> {
    const input = requireRecord(params, 'config.update params');
    const key = requireString(input, 'key');
    const value = requireJsonValue(input.value, 'value');
    const scope = normalizeConfigScope(optionalString(input, 'scope') || 'workspace');
    if (containsSecretLikePath(key, value)) {
      throw new DaemonRpcError(
        -32602,
        'config.secretRejected',
        `Refusing to write secret-like config key '${key}'. Use auth commands for API keys.`,
        { key }
      );
    }

    await this.configStore.set(key, value, { scope });
    if (key === 'toolPermissions' || key === 'openrouterAgent.toolPermissions') {
      this.cachedToolPermissions = normalizeToolPermissionsSetting(value);
    }
    await this.broadcastStateChanged('config.update');
    const redacted = redactConfigValue(key, value);
    return {
      operationId: this.idFactory(),
      key,
      value: redacted.value ?? null,
      scope,
      redacted: redacted.redacted
    };
  }

  private async modelsList(params: unknown, refreshed: boolean): Promise<DaemonModelsResult> {
    const input = asOptionalRecord(params);
    const provider = normalizeModelProvider(optionalString(input, 'provider') || 'all');
    const providers: ModelProvider[] = provider === 'all' ? ['openrouter', 'codex'] : [provider];
    const models: OpenRouterModelOption[] = [];
    const errors: string[] = [];
    let fallbackUsed = false;

    if (providers.includes('openrouter')) {
      const openRouterModels = await this.loadOpenRouterModels().catch((error: unknown) => {
        fallbackUsed = true;
        errors.push(formatError(error));
        return fallbackModels('openrouter');
      });
      if (openRouterModels.fallback) {
        fallbackUsed = true;
      }
      models.push(...openRouterModels.models);
    }

    if (providers.includes('codex')) {
      const transport = new CodexResponsesTransport({
        tokenProvider: { getToken: async () => ({ accessToken: '' }) },
        fetch: this.options.fetch || unusedFetch,
        logger: this.logger
      });
      models.push(...transport.listModels());
    }

    return {
      operationId: this.idFactory(),
      provider,
      refreshed,
      fallbackUsed,
      errors,
      models: dedupeAndSortModels(models)
    };
  }

  private async autonomousState(): Promise<DaemonAutonomousStateResult> {
    return {
      operationId: this.idFactory(),
      state: await this.autonomousBackend.getState()
    };
  }

  private async autonomousFlowStart(params: unknown): Promise<DaemonAutonomousStartResult> {
    const input = requireRecord(params, 'autonomous.flow.start params');
    return this.autonomousBackend.startFlow(requireString(input, 'flowId'), parseAutonomousLaunch(input.launch));
  }

  private async autonomousRunStart(params: unknown): Promise<DaemonAutonomousStartResult> {
    const input = requireRecord(params, 'autonomous.run.start params');
    return this.autonomousBackend.startRun(requireString(input, 'runId'), parseAutonomousLaunch(input.launch));
  }

  private async autonomousStop(params: unknown): Promise<DaemonAutonomousStopResult> {
    const input = requireRecord(params, 'autonomous.stop params');
    return this.autonomousBackend.stop(requireString(input, 'sessionId'));
  }

  private async autonomousExport(params: unknown): Promise<DaemonAutonomousExportResult> {
    const input = requireRecord(params, 'autonomous.export params');
    return this.autonomousBackend.exportSession(
      requireString(input, 'sessionId'),
      normalizeAutonomousExportFormat(optionalString(input, 'format') || 'markdown')
    );
  }

  private createRuntime(): AgentRuntimeService {
    const modelClient = this.options.modelClient || this.createRoutingModelClient();
    return new AgentRuntimeService({
      chatRepository: createFileBackedRuntimeChatRepository(this.chatRepository),
      runRepository: this.runRepository,
      modelClient,
      auxiliaryModel: this.auxiliaryModel,
      toolRegistry: this.toolRegistry,
      handleToolCall: this.createToolCallHandler(),
      configProvider: {
        getSnapshot: () => this.getRuntimeConfig()
      },
      promptProvider: {
        getSystemPrompt: async () => {
          const skills = await this.getConfiguredSkills();
          return buildFileAgentSystemPrompt({
            workspaceRoot: this.workspaceRoot,
            homeDir: this.homeDir,
            language: await this.getLanguage(),
            skills: skills.map(({ id, label, description }) => ({ id, label, description }))
          });
        }
      },
      contextProviders: {
        getEditorContext: () => this.getClientEditorContext(),
        getRepoContextNote: (inputPrompt) => getRepoVerificationContextNote(this.workspaceRoot, inputPrompt),
        getMemoryContextBlock: async (input) =>
          getRelevantMemoryPromptBlockBySubagent({
            selection: {
              prompt: input.prompt,
              chatHistory: input.chat.messages,
              memoryItems: this.memoryStore.list(),
              chatModel: input.chat.model,
              settings: await this.getMemorySubagentSettings(input.chat.model)
            },
            modelClient
          })
      },
      modelCatalog: {
        getOption: getDaemonModelOption
      },
      skillProvider: {
        getSkills: () => this.getConfiguredSkills()
      },
      workspaceRootProvider: {
        getWorkspaceRoot: () => this.workspaceRoot
      },
      eventSink: {
        emit: (event) => this.handleRuntimeEvent(event)
      },
      logger: this.logger,
      concurrencyScope: 'chat',
      reflection: {
        enabled: false
      },
      hooks: {
        onRunFinished: ({ runId }) => {
          this.unregisterActiveRun(runId);
          this.clearApprovalsForRun(runId);
          return this.broadcastStateChanged('run.finished');
        }
      }
    });
  }

  private createToolCallHandler(): AgentRuntimeToolCallHandler {
    return async (params) => {
      const runner = new ToolRunner({
        registry: this.toolRegistry,
        context: params.context,
        approvalService: {
          getPermission: (toolName) => this.getDaemonToolPermission(toolName),
          requestApproval: async (request) => {
            void this.sendClientRequest('notifications', 'client.notification', {
              level: 'info',
              message: `AIST is waiting for approval for ${request.toolCall.function.name}.`
            }).catch((error) => this.logger.warn('Failed to notify daemon client about approval', error));
            return new Promise<ToolApprovalDecision>((resolve) => {
              params.run.permissionResolvers.set(request.messageId, (decision) => {
                params.run.permissionResolvers.delete(request.messageId);
                resolve(decision);
              });
            });
          }
        },
        filesystem: this.options.filesystemToolRunner || {
          execute: createNodeFilesystemToolRunner({
            context: {
              workspaceRoot: this.workspaceRoot,
              workspaceName: path.basename(this.workspaceRoot)
            }
          })
        },
        projectTools: {
          execute: (toolName, args) => this.toolRegistry.runProjectTool(toolName, args, this.workspaceRoot)
        },
        skills: {
          execute: async (_toolName, args) =>
            runNodeSkillTool({
              skills: await this.getConfiguredSkills(),
              workspaceRoot: this.workspaceRoot,
              args
            })
        },
        preview: {
          prepare: (toolName, args) => this.prepareClientPreview(toolName, args)
        },
        memory: {
          add: (candidate) => this.memoryStore.add(candidate)
        },
        auxiliaryModel: this.auxiliaryModel,
        getAuxiliaryModelSettings: (toolName) => this.getAuxiliaryToolSettings(toolName),
        events: params.events,
        runRepository: params.runRepository,
        workspaceRoot: this.workspaceRoot,
        getRunId: () => params.runId
      });
      await runner.handleToolCall(params);
    };
  }

  private registerActiveRun(activeRun: DaemonActiveRun): void {
    this.activeRunsById.set(activeRun.runId, activeRun);
    this.activeRunsByChat.set(activeRun.chatId, activeRun);
  }

  private unregisterActiveRun(runId: string): void {
    const activeRun = this.activeRunsById.get(runId);
    if (!activeRun) {
      return;
    }

    this.activeRunsById.delete(runId);
    this.activeRunsByChat.delete(activeRun.chatId);
  }

  private getActiveRuns(): DaemonActiveRun[] {
    return [...this.activeRunsById.values()];
  }

  private getPrimaryActiveRun(): DaemonActiveRun | null {
    return this.getActiveRuns()[0] || null;
  }

  private async handleRuntimeEvent(event: RuntimeEvent): Promise<void> {
    if (event.type === 'tool.call.approvalRequested') {
      const pending = {
        approvalId: event.approvalId,
        messageId: event.messageId,
        runId: event.runId,
        chatId: event.chatId
      };
      this.pendingApprovalsById.set(event.approvalId, pending);
      this.pendingApprovalsByMessageId.set(event.messageId, pending);
    } else if (event.type === 'tool.call.approvalResolved') {
      this.pendingApprovalsById.delete(event.approvalId);
      this.pendingApprovalsByMessageId.delete(event.messageId);
    }

    this.broadcastEvent(event);
    await this.broadcastStateChanged(event.type);
  }

  private async broadcastStateChanged(reason?: string): Promise<void> {
    this.broadcastEvent({
      type: 'state.changed',
      workspaceRoot: this.workspaceRoot,
      reason,
      activeRun: this.getPrimaryActiveRun(),
      activeRuns: this.getActiveRuns(),
      at: this.now()
    });
  }

  private broadcastEvent(event: DaemonEvent): void {
    const payload = `${JSON.stringify({ jsonrpc: '2.0', method: DAEMON_EVENT_METHOD, params: event })}\n`;
    for (const connection of this.connections) {
      if (connection.subscribed && !connection.socket.destroyed) {
        connection.socket.write(payload);
      }
    }
  }

  private async readState(): Promise<DaemonState> {
    return {
      workspaceRoot: this.workspaceRoot,
      protocolVersion: DAEMON_PROTOCOL_VERSION,
      transport: {
        kind: 'local-socket',
        framing: 'json-rpc-2.0-newline-delimited',
        socketPath: this.socketPath
      },
      activeRun: this.getPrimaryActiveRun(),
      activeRuns: this.getActiveRuns(),
      chats: await this.chatRepository.list()
    };
  }

  private async resetStaleRuntimeState(): Promise<void> {
    const summaries = await this.chatRepository.list();
    for (const summary of summaries) {
      const chat = await this.chatRepository.get(summary.id);
      if (chat?.busy || chat?.activity || chat?.activityDetail || chat?.modelRequest) {
        await this.chatRepository.updateState(summary.id, {
          busy: false,
          activity: undefined,
          activityDetail: undefined,
          modelRequest: undefined
        });
      }
    }
  }

  private async requireChat(chatId: string): Promise<Chat> {
    const chat = await this.chatRepository.get(chatId);
    if (!chat) {
      throw new DaemonRpcError(-32004, 'chat.notFound', `Chat not found: ${chatId}`, { chatId });
    }

    return chat;
  }

  private async resolveChatModel(): Promise<string> {
    const configuredModel = await this.configStore.get<JsonValue>('model', DEFAULT_MODEL);
    return typeof configuredModel === 'string' && configuredModel.trim() ? configuredModel : DEFAULT_MODEL;
  }

  private async getDefaultChatModelSettings(): Promise<ChatModelSettings> {
    return {
      model: await this.resolveChatModel(),
      reasoningEffort: await this.getReasoningEffort(),
      codexServiceTier: await this.getCodexServiceTier(),
      maxToolIterations: Math.max(
        0,
        Math.floor(await this.getNumberSetting(['openrouterAgent.maxToolIterations', 'maxToolIterations'], 0))
      ),
      editorContextMode: await this.getEditorContextMode(),
      streamingEnabled: await this.getBooleanSetting(['openrouterAgent.streamingEnabled', 'streamingEnabled'], false)
    };
  }

  private async createCompactionSummary(
    chat: Chat,
    providedSummary: string | undefined,
    keepLastMessages: number
  ): Promise<{ summary: string; model: string }> {
    const cleanProvidedSummary = providedSummary?.trim();
    if (cleanProvidedSummary) {
      return { summary: cleanProvidedSummary, model: chat.model };
    }

    const { summaryHistory } = splitCompactionHistory(chat.history, keepLastMessages);
    const history = summaryHistory.length ? summaryHistory : chat.history;
    const compactionModel = (await this.getAuxiliaryModelSetting('compaction', 'model')) || chat.model;
    const response = await this.auxiliaryModel.invoke({
      messages: createCompactionMessages(history),
      model: compactionModel,
      reasoningEffort: await this.getAuxiliaryReasoningEffort('compaction'),
      tools: (await this.getAuxiliaryBooleanSetting('compaction', 'allowTools', false))
        ? this.toolRegistry.snapshot().tools
        : undefined
    });
    const summary = response.content?.trim();
    if (!summary) {
      throw new DaemonRpcError(-32000, 'chat.compaction.empty', 'Model returned an empty compaction summary.', {
        chatId: chat.id
      });
    }

    return { summary, model: compactionModel };
  }

  private createRoutingModelClient(): ModelClient {
    return {
      chat: async (messages, tools, modelOverride, signal, stream, lifecycle, requestOptions) => {
        const model = modelOverride || DEFAULT_MODEL;
        const client = await this.createModelClientForModel(model, requestOptions?.reasoningEffort);
        return client.chat(messages, tools, model, signal, stream, lifecycle, requestOptions);
      }
    };
  }

  private createAuxiliaryModelInvoker(): AuxiliaryModelInvoker {
    return createAuxiliaryModelInvoker({
      defaultModel: DEFAULT_MODEL,
      createClient: (model, reasoningEffort) => this.createModelClientForModel(model, reasoningEffort)
    });
  }

  private async createModelClientForModel(model: string, reasoningEffort?: ReasoningEffort): Promise<ModelClient> {
    if (model.startsWith('codex:')) {
      const profile = await this.getProviderProfile('codex');
      const secretStore = new FileSecretStore({ homeDir: this.homeDir, logger: this.logger });
      const authProvider = new CodexAuthSessionProvider(secretStore, {
        fetch: this.options.fetch,
        logger: this.logger
      });
      if (!(await authProvider.isAuthenticated())) {
        throw new DaemonRpcError(
          -32001,
          'auth.codex.missing',
          'ChatGPT Codex auth is not configured. Login through the VS Code extension before using codex:* models.',
          { model }
        );
      }

      return new CodexResponsesTransport({
        tokenProvider: authProvider,
        fetch: this.options.fetch,
        logger: this.logger,
        endpoint: profile.endpoint || undefined,
        proxyHost: profile.proxyHost || undefined,
        defaultModel: model,
        serviceTier: await this.getCodexServiceTier()
      });
    }

    const profile = await this.getProviderProfile('openrouter');
    const apiKey = await this.getOpenRouterApiKey();
    if (!apiKey) {
      throw new DaemonRpcError(
        -32001,
        'auth.openrouter.missing',
        `OpenRouter API key is not configured. Set ${OPENROUTER_ENV_KEY} or store a global auth secret.`,
        { model }
      );
    }

    return new OpenRouterTransport({
      apiKey,
      fetch: this.options.fetch,
      logger: this.logger,
      // E2E запускает реальный VS Code и daemon, но модель должна быть локальным mock server,
      // чтобы тесты проверяли функциональность расширения без внешних ИИ-запросов.
      chatEndpoint: this.env[E2E_OPENROUTER_ENDPOINT_ENV_KEY] || profile.endpoint || undefined,
      proxyHost: this.env[E2E_OPENROUTER_ENDPOINT_ENV_KEY] ? undefined : profile.proxyHost || undefined,
      siteUrl: await this.getStringSetting(['openrouterAgent.siteUrl', 'siteUrl']),
      siteName: (await this.getStringSetting(['openrouterAgent.siteName', 'siteName'])) || 'aist',
      reasoningEffort: reasoningEffort || (await this.getReasoningEffort())
    });
  }

  private async getRuntimeConfig(): Promise<AgentRuntimeConfigSnapshot> {
    this.cachedToolPermissions = await this.getToolPermissionsSetting();
    return {
      maxToolIterations: Math.max(
        0,
        Math.floor(await this.getNumberSetting(['openrouterAgent.maxToolIterations', 'maxToolIterations'], 0))
      ),
      streamingEnabled: await this.getBooleanSetting(['openrouterAgent.streamingEnabled', 'streamingEnabled'], false),
      auxiliaryModelToolEnabled: await this.hasAuxiliaryToolModelSettings(),
      disabledProjectToolIds: await this.getStringArraySetting([
        'openrouterAgent.projectToolDisabledIds',
        'projectToolDisabledIds'
      ])
    };
  }

  private async getClientEditorContext(): Promise<EditorContextInput | undefined> {
    const context = await this.sendClientRequest('activeEditorContext', 'client.activeEditorContext', undefined).catch(
      (error) => {
        this.logger.warn('Failed to read active editor context from daemon client', error);
        return undefined;
      }
    );

    return isEditorContextInput(context) ? context : undefined;
  }

  private async prepareClientPreview(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<ToolExecutionPreview | undefined> {
    const previewId = this.idFactory();
    const prepared = await this.sendClientRequest<DaemonClientPreviewPrepareResult>(
      'vscodeEditableDiffPreview',
      'client.previewEdit.prepare',
      {
        previewId,
        toolName,
        args: args as JsonObject
      }
    ).catch((error) => {
      this.logger.warn('Failed to prepare VS Code editable diff preview', error);
      return undefined;
    });

    if (!prepared?.preview) {
      return undefined;
    }

    return {
      preview: prepared.preview,
      approvalPreviewKind: 'vscode-editable-diff',
      approve: async () => {
        const result = await this.sendClientRequest<JsonObject>(
          'vscodeEditableDiffPreview',
          'client.previewEdit.approve',
          { previewId }
        );
        return result || { ok: true };
      },
      cleanup: async () => {
        await this.sendClientRequest('vscodeEditableDiffPreview', 'client.previewEdit.cleanup', {
          previewId
        }).catch((error) => this.logger.warn('Failed to cleanup VS Code editable diff preview', error));
      }
    };
  }

  private sendClientRequest<T = unknown>(
    capability: keyof DaemonClientCapabilities,
    method: string,
    params: unknown
  ): Promise<T | undefined> {
    const connection = [...this.connections].find(
      (item) => item.capabilities[capability] === true && !item.socket.destroyed
    );
    if (!connection) {
      return Promise.resolve(undefined);
    }

    const id = `server-${this.nextClientRequestId++}`;
    const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params });
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        connection.pendingClientRequests.delete(id);
        reject(new Error(`Timed out waiting for daemon client method: ${method}`));
      }, 60000);
      timeout.unref();
      connection.pendingClientRequests.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timeout
      });
      connection.socket.write(`${payload}\n`, (error) => {
        if (!error) {
          return;
        }

        clearTimeout(timeout);
        connection.pendingClientRequests.delete(id);
        reject(error);
      });
    });
  }

  private handleClientResponse(connection: DaemonConnection, response: JsonRpcResponse): void {
    if (typeof response.id !== 'string') {
      return;
    }

    const pending = connection.pendingClientRequests.get(response.id);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeout);
    connection.pendingClientRequests.delete(response.id);
    if (response.error) {
      pending.reject(new DaemonRpcError(response.error.code, 'client.requestFailed', response.error.message));
      return;
    }

    pending.resolve(response.result);
  }

  private rejectPendingClientRequests(connection: DaemonConnection, error: unknown): void {
    for (const pending of connection.pendingClientRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    connection.pendingClientRequests.clear();
  }

  private async getLanguage(): Promise<AgentLanguage> {
    const language = await this.getStringSetting(['openrouterAgent.language', 'language']);
    return language === 'ru' ? 'ru' : 'en';
  }

  private async getReasoningEffort(): Promise<ReasoningEffort> {
    const value = await this.getStringSetting(['openrouterAgent.reasoningEffort', 'reasoningEffort']);
    return value === 'low' || value === 'medium' || value === 'high' ? value : 'auto';
  }

  private async getCodexServiceTier(): Promise<CodexServiceTier> {
    const value = await this.getStringSetting(['openrouterAgent.codexServiceTier', 'codexServiceTier']);
    return value === 'priority' ? 'priority' : 'auto';
  }

  private async getEditorContextMode(): Promise<EditorContextMode> {
    const value = await this.getStringSetting(['openrouterAgent.editorContextMode', 'editorContextMode']);
    return value === 'selection' || value === 'file' || value === 'off' ? value : 'auto';
  }

  private async getProviderProfile(provider: ModelProvider): Promise<ProviderProfile> {
    const raw = await this.getFirstConfigSetting(['openrouterAgent.providerProfiles', 'providerProfiles']);
    const profiles = normalizeProviderProfiles(raw);
    return (
      profiles.find((profile) => profile.provider === provider && profile.id === provider) ||
      profiles.find((profile) => profile.provider === provider)!
    );
  }

  private async getAuxiliaryModelSetting(
    id: 'compaction' | 'tool' | 'memory',
    key: 'model'
  ): Promise<string | undefined> {
    return this.getStringSetting([
      `openrouterAgent.auxiliaryModels.${id}.${key}`,
      `auxiliaryModels.${id}.${key}`,
      getAuxiliaryLegacySettingKey(id, key)
    ]);
  }

  private async getAuxiliaryReasoningEffort(id: 'compaction' | 'tool' | 'memory'): Promise<ReasoningEffort> {
    const value = await this.getStringSetting([
      `openrouterAgent.auxiliaryModels.${id}.reasoningEffort`,
      `auxiliaryModels.${id}.reasoningEffort`,
      getAuxiliaryLegacySettingKey(id, 'reasoningEffort')
    ]);
    return value === 'low' || value === 'medium' || value === 'high' ? value : 'auto';
  }

  private async getAuxiliaryBooleanSetting(
    id: 'compaction' | 'tool' | 'memory',
    key: 'allowTools',
    fallback: boolean
  ): Promise<boolean> {
    return this.getBooleanSetting(
      [
        `openrouterAgent.auxiliaryModels.${id}.${key}`,
        `auxiliaryModels.${id}.${key}`,
        getAuxiliaryLegacySettingKey(id, key)
      ],
      fallback
    );
  }

  private async getAuxiliaryToolSettings(toolName: string): Promise<{
    model?: string;
    reasoningEffort: ReasoningEffort;
    allowTools: boolean;
  }> {
    const override = await this.getAuxiliaryToolOverride(toolName);
    if (override) {
      return override;
    }

    return {
      model: await this.getAuxiliaryModelSetting('tool', 'model'),
      reasoningEffort: await this.getAuxiliaryReasoningEffort('tool'),
      allowTools: await this.getAuxiliaryBooleanSetting('tool', 'allowTools', false)
    };
  }

  private async getMemorySubagentSettings(
    chatModel: string
  ): Promise<{ model: string; reasoningEffort: ReasoningEffort }> {
    return {
      model: (await this.getAuxiliaryModelSetting('memory', 'model')) || chatModel,
      reasoningEffort: await this.getAuxiliaryReasoningEffort('memory')
    };
  }

  private async hasAuxiliaryToolModelSettings(): Promise<boolean> {
    const defaultModel = await this.getAuxiliaryModelSetting('tool', 'model');
    if (defaultModel) {
      return true;
    }
    return (await this.getAuxiliaryToolOverrides()).some((override) => Boolean(override.model));
  }

  private async getAuxiliaryToolOverride(toolName: string): Promise<
    | {
        model?: string;
        reasoningEffort: ReasoningEffort;
        allowTools: boolean;
      }
    | undefined
  > {
    return (await this.getAuxiliaryToolOverrides()).find((override) => override.toolName === toolName);
  }

  private async getAuxiliaryToolOverrides(): Promise<
    Array<{ toolName: string; model?: string; reasoningEffort: ReasoningEffort; allowTools: boolean }>
  > {
    const raw = await this.getFirstConfigSetting([
      'openrouterAgent.auxiliaryModels.tool.overrides',
      'auxiliaryModels.tool.overrides'
    ]);
    if (!Array.isArray(raw)) {
      return [];
    }

    const overrides: Array<{
      toolName: string;
      model?: string;
      reasoningEffort: ReasoningEffort;
      allowTools: boolean;
    }> = [];
    for (const item of raw) {
      const record = isJsonObject(item) ? item : {};
      const toolName = typeof record.toolName === 'string' ? record.toolName.trim() : '';
      if (!toolName) {
        continue;
      }
      const model = typeof record.model === 'string' && record.model.trim() ? record.model.trim() : undefined;
      const reasoningEffort: ReasoningEffort =
        record.reasoningEffort === 'low' || record.reasoningEffort === 'medium' || record.reasoningEffort === 'high'
          ? record.reasoningEffort
          : 'auto';
      overrides.push({
        toolName,
        ...(model ? { model } : {}),
        reasoningEffort,
        allowTools: record.allowTools === true
      });
    }

    return overrides;
  }

  private async getStringSetting(keys: readonly string[]): Promise<string | undefined> {
    const value = await this.getFirstConfigSetting(keys);
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private async getNumberSetting(keys: readonly string[], fallback: number): Promise<number> {
    const value = await this.getFirstConfigSetting(keys);
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  private async getBooleanSetting(keys: readonly string[], fallback: boolean): Promise<boolean> {
    const value = await this.getFirstConfigSetting(keys);
    return typeof value === 'boolean' ? value : fallback;
  }

  private async getStringArraySetting(keys: readonly string[]): Promise<readonly string[]> {
    const value = await this.getFirstConfigSetting(keys);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }

  private async getToolPermissionsSetting(): Promise<Record<string, ToolPermissionMode>> {
    const value = await this.getFirstConfigSetting(['openrouterAgent.toolPermissions', 'toolPermissions']);
    return normalizeToolPermissionsSetting(value);
  }

  private async getConfiguredSkills(): Promise<readonly AgentSkill[]> {
    const value = await this.getFirstConfigSetting(['openrouterAgent.customSkills', 'customSkills']);
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((item) => normalizeDaemonSkill(item)).filter((skill): skill is AgentSkill => Boolean(skill));
  }

  private getDaemonToolPermission(toolName: string): ToolPermissionMode {
    const configured = this.cachedToolPermissions[toolName];
    if (configured === 'ask' || configured === 'auto') {
      return configured;
    }

    if (READONLY_DAEMON_TOOLS.has(toolName)) {
      return 'auto';
    }

    return getToolExecutionRequirement(toolName).mode === 'auto' ? 'auto' : 'ask';
  }

  private async getFirstConfigSetting(keys: readonly string[]): Promise<JsonValue | undefined> {
    for (const key of keys) {
      const value = await this.configStore.get<JsonValue>(key);
      if (value !== undefined) {
        return value;
      }
    }

    return undefined;
  }

  private async getOpenRouterApiKey(): Promise<string | undefined> {
    if (this.env[OPENROUTER_ENV_KEY]) {
      return this.env[OPENROUTER_ENV_KEY];
    }

    const secretStore = new FileSecretStore({ homeDir: this.homeDir, logger: this.logger });
    return secretStore.get(OPENROUTER_API_KEY_SECRET_KEY);
  }

  private async loadOpenRouterModels(): Promise<{
    readonly fallback: boolean;
    readonly models: readonly OpenRouterModelOption[];
  }> {
    const apiKey = await this.getOpenRouterApiKey();
    if (!apiKey) {
      return fallbackModels('openrouter');
    }

    const profile = await this.getProviderProfile('openrouter');
    const transport = new OpenRouterTransport({
      apiKey,
      fetch: this.options.fetch,
      logger: this.logger,
      chatEndpoint: profile.endpoint || undefined,
      proxyHost: profile.proxyHost || undefined
    });
    return {
      fallback: false,
      models: await transport.listModels()
    };
  }

  private clearApprovalsForRun(runId: string): void {
    for (const pending of [...this.pendingApprovalsById.values()]) {
      if (pending.runId === runId) {
        this.pendingApprovalsById.delete(pending.approvalId);
        this.pendingApprovalsByMessageId.delete(pending.messageId);
      }
    }
  }

  private createBusyError(chatId?: string): DaemonRpcError {
    const activeRun = chatId ? this.activeRunsByChat.get(chatId) : this.getPrimaryActiveRun();
    const message = chatId ? 'Chat already has an active run.' : 'Workspace already has active runs.';
    return new DaemonRpcError(-32010, DAEMON_BUSY_ERROR_CODE, message, {
      code: DAEMON_BUSY_ERROR_CODE,
      activeRun: activeRun ?? undefined,
      activeRuns: this.getActiveRuns()
    });
  }

  private sendResult(connection: DaemonConnection, id: JsonRpcId, result: unknown): void {
    connection.socket.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`);
  }

  private sendError(connection: DaemonConnection, id: JsonRpcId, error: JsonRpcErrorObject): void {
    connection.socket.write(`${JSON.stringify({ jsonrpc: '2.0', id, error })}\n`);
  }
}

class DaemonRpcError extends Error {
  constructor(
    readonly rpcCode: number,
    readonly code: string,
    message: string,
    readonly details: JsonObject = {}
  ) {
    super(message);
    this.name = 'DaemonRpcError';
  }
}

class DaemonFileLogger {
  constructor(private readonly filePath: string) {}

  info(message: string, details?: unknown): void {
    void this.write('info', message, details);
  }

  warn(message: string, details?: unknown): void {
    void this.write('warn', message, details);
  }

  error(message: string, details?: unknown): void {
    void this.write('error', message, details);
  }

  private async write(level: string, message: string, details?: unknown): Promise<void> {
    const line = JSON.stringify({
      at: new Date().toISOString(),
      level,
      message,
      details: sanitizeLogDetails(details)
    });
    await safeMkdir(path.dirname(this.filePath)).catch(() => undefined);
    await fs.promises.appendFile(this.filePath, `${line}\n`, 'utf8').catch(() => undefined);
  }
}

function createFileBackedRuntimeChatRepository(repository: ChatRepository): AgentRuntimeChatRepository {
  const activePlans = new Map<string, Chat['activePlan']>();

  return {
    getChat: async (chatId) => {
      const chat = await repository.get(chatId);
      activePlans.set(chatId, chat?.activePlan);
      return chat;
    },
    appendMessage: (chatId, message) => repository.appendMessage(chatId, message),
    updateMessage: (chatId, messageId, patch) => repository.updateMessage(chatId, messageId, patch),
    setBusy: (chatId, busy) => repository.setBusy(chatId, busy),
    setActivity: (chatId, activity, detail) => repository.setActivity(chatId, activity, detail),
    setActivityDetail: (chatId, detail) => repository.setActivityDetail(chatId, detail),
    setModelRequest: (chatId, modelRequest) => repository.setModelRequest(chatId, modelRequest),
    updateModelRequest: (chatId, patch) => repository.updateModelRequest(chatId, patch),
    setHistory: (chatId, history) => repository.setHistory(chatId, history),
    setLastAnswer: (chatId, answer) => repository.setLastAnswer(chatId, answer),
    addUsage: (chatId, usage) => repository.addUsage(chatId, usage),
    setContext: (chatId, context) => repository.setContext(chatId, context),
    getActivePlan: (chatId) => activePlans.get(chatId),
    setActivePlan: async (chatId, activePlan) => {
      activePlans.set(chatId, activePlan);
      await repository.setActivePlan(chatId, activePlan);
    },
    addReflectionCandidates: (chatId, candidates) => repository.addReflectionCandidates(chatId, candidates)
  };
}

async function prepareSocketPath(socketPath: string): Promise<void> {
  if (process.platform === 'win32') {
    return;
  }

  await safeMkdir(path.dirname(socketPath));
  if (!fs.existsSync(socketPath)) {
    return;
  }

  const existingServer = await canConnectSocket(socketPath);
  if (existingServer) {
    throw new DaemonRpcError(-32000, 'daemon.alreadyRunning', `Daemon socket is already active: ${socketPath}`, {
      socketPath
    });
  }

  await fs.promises.rm(socketPath, { force: true });
}

function canConnectSocket(socketPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection(socketPath);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function isValidJsonRpcRequest(value: unknown): value is JsonRpcRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const request = value as JsonRpcRequest;
  return request.jsonrpc === '2.0' && typeof request.method === 'string';
}

function isJsonRpcResponse(value: unknown): value is JsonRpcResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const response = value as JsonRpcResponse;
  return response.jsonrpc === '2.0' && 'id' in response && ('result' in response || 'error' in response);
}

function createJsonRpcError(
  code: number,
  dataCode: string,
  message: string,
  details: JsonObject = {}
): JsonRpcErrorObject {
  return {
    code,
    message,
    data: {
      code: dataCode,
      ...details
    }
  };
}

function toJsonRpcError(error: unknown): JsonRpcErrorObject {
  if (error instanceof DaemonRpcError) {
    return createJsonRpcError(error.rpcCode, error.code, error.message, error.details);
  }

  const message = error instanceof Error ? error.message : String(error);
  return createJsonRpcError(-32603, 'internal.error', message);
}

function getDaemonModelOption(modelId: string): OpenRouterModelOption {
  const known = FALLBACK_MODEL_OPTIONS.find((model) => model.id === modelId);
  if (known) {
    return known;
  }

  return {
    id: modelId,
    name: modelId,
    provider: modelId.startsWith('codex:') ? 'codex' : 'openrouter',
    supportsTools: true
  };
}

function isEditorContextInput(value: unknown): value is EditorContextInput {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const input = value as Partial<EditorContextInput>;
  return (
    typeof input.fileName === 'string' &&
    typeof input.languageId === 'string' &&
    typeof input.selectionText === 'string' &&
    typeof input.fullText === 'string' &&
    (input.mode === 'auto' || input.mode === 'selection' || input.mode === 'file' || input.mode === 'off')
  );
}

function normalizeDaemonSkill(value: unknown): AgentSkill | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  const label = typeof record.label === 'string' ? record.label.trim() : '';
  const command = typeof record.command === 'string' ? record.command.trim() : '';
  if (!id || !label || !command) {
    return undefined;
  }

  const permission = record.permission === 'auto' ? 'auto' : 'ask';
  return {
    id,
    label,
    command,
    permission,
    description: typeof record.description === 'string' ? record.description.trim() : '',
    scope: typeof record.scope === 'string' ? record.scope : undefined
  };
}

function normalizeChatModelSettings(value: unknown, fallback: ChatModelSettings): ChatModelSettings {
  const record = value && typeof value === 'object' ? (value as Partial<ChatModelSettings>) : {};
  const reasoningEffort: ReasoningEffort =
    record.reasoningEffort === 'low' || record.reasoningEffort === 'medium' || record.reasoningEffort === 'high'
      ? record.reasoningEffort
      : 'auto';
  const codexServiceTier: CodexServiceTier = record.codexServiceTier === 'priority' ? 'priority' : 'auto';
  const editorContextMode: EditorContextMode =
    record.editorContextMode === 'selection' ||
    record.editorContextMode === 'file' ||
    record.editorContextMode === 'off'
      ? record.editorContextMode
      : 'auto';
  return {
    model: typeof record.model === 'string' && record.model.trim() ? record.model : fallback.model,
    reasoningEffort,
    codexServiceTier,
    maxToolIterations: Math.max(0, Math.floor(Number(record.maxToolIterations) || 0)),
    editorContextMode,
    streamingEnabled: record.streamingEnabled === true
  };
}

function createMemorySubagentMessages(input: {
  runId: string;
  parentChatId: string;
  startedAt: number;
  finishedAt: number;
  candidateCount: number;
  error?: string;
  responseContent?: string;
}) {
  const taskMessage = {
    id: `${input.runId}-task`,
    role: 'user' as const,
    content: 'Проанализируй текущий чат и предложи 0–3 безопасные заметки для долговременной памяти.',
    createdAt: input.startedAt
  };
  const modelMessage = {
    id: `${input.runId}-model`,
    role: 'tool' as const,
    name: 'memory.analysis',
    status: input.error ? ('error' as const) : ('done' as const),
    reason: 'Субагент получает историю чата и уже сохранённые заметки памяти.',
    nextStep: 'Вернуть JSON-кандидаты, которые пользователь сможет сохранить или отклонить.',
    args: { chatId: input.parentChatId, mode: 'single_model_call', tools: [] },
    result: input.error ? { ok: false, error: input.error } : { ok: true, candidateCount: input.candidateCount },
    modelResult: input.error ? { ok: false, error: input.error } : { ok: true, candidateCount: input.candidateCount },
    createdAt: input.startedAt + 1
  };
  const finalMessage = {
    id: `${input.runId}-${input.error ? 'error' : 'answer'}`,
    role: input.error ? ('error' as const) : ('assistant' as const),
    content: input.error
      ? `Анализ памяти не завершился: ${input.error}`
      : input.responseContent || formatMemorySubagentSuccessText(input.candidateCount),
    createdAt: input.finishedAt
  };

  return [taskMessage, modelMessage, finalMessage];
}

function formatMemorySubagentSuccessText(candidateCount: number): string {
  return candidateCount
    ? `Субагент памяти завершил анализ: найдено предложений — ${candidateCount}.`
    : 'Субагент памяти завершил анализ: новых безопасных заметок не найдено.';
}

/**
 * Что это: выбор файла памяти для подтверждённого предложения.
 * Зачем нужно: global сохраняет только явные пользовательские предпочтения, а проектные правила остаются в workspace памяти.
 */
function getReflectionMemoryScope(
  candidate: NonNullable<ReturnType<typeof validateReflectionCandidates>[number]>
): AgentMemoryScope {
  return candidate.kind === 'memory_preference' && candidate.scope === 'global' ? 'global' : 'project';
}

/**
 * Что это: нормализация текста кандидата перед записью в память.
 * Зачем нужно: в памяти хранится понятная заметка, а не технический enum из reflection-системы.
 */
function getReflectionMemoryNote(
  candidate: NonNullable<ReturnType<typeof validateReflectionCandidates>[number]>
): string {
  if (candidate.kind === 'verification_command') {
    return `Verification command: ${candidate.content}`;
  }
  if (candidate.kind === 'declarative_definition') {
    return `Possible declarative definition: ${candidate.content}`;
  }

  return candidate.content;
}

function fallbackModels(provider: ModelProvider): {
  readonly fallback: true;
  readonly models: readonly OpenRouterModelOption[];
} {
  return {
    fallback: true,
    models: FALLBACK_MODEL_OPTIONS.filter((model) => model.provider === provider)
  };
}

function dedupeAndSortModels(models: readonly OpenRouterModelOption[]): OpenRouterModelOption[] {
  const byId = new Map<string, OpenRouterModelOption>();
  for (const model of models) {
    byId.set(model.id, model);
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function toDaemonChat(chat: Chat): DaemonChat {
  return {
    id: chat.id,
    title: chat.title,
    model: chat.model,
    modelSettings: chat.modelSettings,
    previousChatId: chat.previousChatId ?? null,
    compactedAt: chat.compactedAt ?? null,
    compactionModel: chat.compactionModel ?? null,
    messages: chat.messages,
    history: chat.history as JsonValue[],
    lastAnswer: chat.lastAnswer,
    busy: chat.busy,
    activity: chat.activity ?? null,
    activityDetail: chat.activityDetail ?? null,
    modelRequest: (chat.modelRequest as JsonValue | undefined) ?? null,
    context: (chat.context as JsonValue | undefined) ?? null,
    contextLength: chat.contextLength ?? null,
    activePlan: (chat.activePlan as JsonValue | undefined) ?? null,
    reflectionCandidates: (chat.reflectionCandidates as JsonValue[] | undefined) ?? [],
    usage: chat.usage as JsonValue,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt
  };
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isJsonObject(value)) {
    throw new DaemonRpcError(-32602, 'params.invalid', `${label} must be an object.`);
  }

  return value;
}

function asOptionalRecord(value: unknown): Record<string, unknown> {
  if (value === undefined || value === null) {
    return {};
  }

  return requireRecord(value, 'params');
}

function requireString(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new DaemonRpcError(-32602, 'params.invalid', `Param '${key}' must be a non-empty string.`, { key });
  }

  return value;
}

function optionalString(input: Record<string, unknown>, key: string): string | undefined {
  const value = input[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function getAuxiliaryLegacySettingKey(id: 'compaction' | 'tool' | 'memory', key: string): string {
  if (id === 'compaction') {
    return `compaction.${key}`;
  }
  if (id === 'tool') {
    return `toolModel.${key}`;
  }
  return `memorySubagent.${key}`;
}

function optionalNumber(input: Record<string, unknown>, key: string): number | undefined {
  const value = input[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function hasApprovalDecision(input: Record<string, unknown>): boolean {
  return (
    input.decision === 'approve' ||
    input.decision === 'deny-stop' ||
    input.decision === 'deny-continue' ||
    input.action === 'approve' ||
    input.action === 'deny-stop' ||
    input.action === 'deny-continue' ||
    typeof input.approved === 'boolean'
  );
}

function requireJsonValue(value: unknown, key: string): JsonValue {
  if (!isJsonValue(value)) {
    throw new DaemonRpcError(-32602, 'params.invalid', `Param '${key}' must be JSON-serializable.`, { key });
  }

  return value;
}

function normalizeConfigScope(value: string): ConfigScope {
  if (value === 'global' || value === 'workspace') {
    return value;
  }

  throw new DaemonRpcError(-32602, 'params.invalid', 'Config scope must be global or workspace.', { scope: value });
}

function normalizeToolPermissionsSetting(value: unknown): Record<string, ToolPermissionMode> {
  if (!isJsonObject(value)) {
    return {};
  }

  const permissions: Record<string, ToolPermissionMode> = {};
  for (const [toolName, permission] of Object.entries(value)) {
    if (permission === 'ask' || permission === 'auto') {
      permissions[toolName] = permission;
    }
  }
  return permissions;
}

function normalizeModelProvider(value: string): ModelProvider | 'all' {
  if (value === 'openrouter' || value === 'codex' || value === 'all') {
    return value;
  }

  throw new DaemonRpcError(-32602, 'params.invalid', 'Model provider must be openrouter, codex, or all.', {
    provider: value
  });
}

function parseAutonomousLaunch(value: unknown): AutonomousLaunchOptions {
  const input = asOptionalRecord(value);
  const engineId = optionalString(input, 'engineId') || 'dry-run';
  if (
    engineId !== 'claude-cli' &&
    engineId !== 'codex-cli' &&
    engineId !== 'openrouter-api' &&
    engineId !== 'codex-api' &&
    engineId !== 'dry-run'
  ) {
    throw new DaemonRpcError(-32602, 'params.invalid', 'Autonomous engine id is invalid.', { engineId });
  }

  return {
    engineId,
    dryRun: typeof input.dryRun === 'boolean' ? input.dryRun : true,
    workDir: optionalString(input, 'workDir'),
    extraPrompt: optionalString(input, 'extraPrompt')
  };
}

function normalizeAutonomousExportFormat(value: string): AutonomousExportFormat {
  if (value === 'markdown' || value === 'json') {
    return value;
  }

  throw new DaemonRpcError(-32602, 'params.invalid', 'Autonomous export format must be markdown or json.', {
    format: value
  });
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return Number.isFinite(value as number) || typeof value !== 'number';
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (isJsonObject(value)) {
    return Object.values(value).every((item) => item === undefined || isJsonValue(item));
  }

  return false;
}

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function readOptionalJsonObject(filePath: string): Promise<JsonObject> {
  try {
    const parsed = JSON.parse(await fs.promises.readFile(filePath, 'utf8')) as unknown;
    return isJsonObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function mergeJsonObjects(base: JsonObject, override: JsonObject): JsonObject {
  const result: JsonObject = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const current = result[key];
    if (isJsonObject(current) && isJsonObject(value)) {
      result[key] = mergeJsonObjects(current, value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

function getJsonPath(settings: JsonObject, key: string): JsonValue | undefined {
  if (Object.prototype.hasOwnProperty.call(settings, key)) {
    return settings[key];
  }

  const segments = key.split('.');
  let current: JsonValue | undefined = settings;

  for (const segment of segments) {
    if (!isJsonObject(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

function redactConfigValue(key: string, value: JsonValue | undefined): RedactedConfigValue {
  if (value === undefined) {
    return { value, redacted: false };
  }

  if (isSecretLikeConfigPath(key)) {
    return { value: REDACTED_VALUE, redacted: true };
  }

  if (Array.isArray(value)) {
    let redacted = false;
    const items = value.map((item) => {
      const result = redactConfigValue(key, item);
      redacted = redacted || result.redacted;
      return result.value ?? null;
    });
    return { value: items, redacted };
  }

  if (isJsonObject(value)) {
    let redacted = false;
    const result: JsonObject = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      if (childValue === undefined) {
        continue;
      }

      const pathKey = key ? `${key}.${childKey}` : childKey;
      const child = redactConfigValue(pathKey, childValue);
      redacted = redacted || child.redacted;
      result[childKey] = child.value;
    }
    return { value: result, redacted };
  }

  return { value, redacted: false };
}

function containsSecretLikePath(key: string, value: JsonValue): boolean {
  if (isSecretLikeConfigPath(key)) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsSecretLikePath(key, item));
  }

  if (isJsonObject(value)) {
    return Object.entries(value).some(([childKey, childValue]) => {
      return childValue !== undefined && containsSecretLikePath(key ? `${key}.${childKey}` : childKey, childValue);
    });
  }

  return false;
}

function isSecretLikeConfigPath(key: string): boolean {
  return key
    .split('.')
    .some((segment) => ['apikey', 'api_key', 'token', 'secret', 'password', 'oauth'].includes(segment.toLowerCase()));
}

function asJsonObject(value: JsonValue | undefined): JsonObject {
  return isJsonObject(value) ? value : {};
}

function sanitizeLogDetails(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    };
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeLogDetails);
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = isSecretLikeConfigPath(key) ? REDACTED_VALUE : sanitizeLogDetails(item);
    }
    return result;
  }

  return value;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
