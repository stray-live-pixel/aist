import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

import {
  type AgentRuntimeChatRepository,
  type AgentRuntimeConfigSnapshot,
  AgentRuntimeService,
  type AgentRuntimeToolCallHandler
} from '../core/agentRuntime';
import { getToolExecutionRequirement, normalizeToolApprovalDecision } from '../core/approvalProtocol';
import { ChatRepository } from '../core/chatRepository';
import { CodexAuthSessionProvider } from '../core/codexAuth';
import { CodexResponsesTransport } from '../core/codexTransport';
import { createCompactionMessages, selectCompactionTailMessages, splitCompactionHistory } from '../core/compaction';
import {
  type ConfigScope,
  FileBackedConfigStore,
  FileSecretStore,
  OPENROUTER_API_KEY_SECRET_KEY
} from '../core/config';
import { createNodeFilesystemToolRunner } from '../core/filesystemTools';
import { AgentMemoryStore, createMemoryStorePaths, getRelevantMemoryPromptBlock } from '../core/memory';
import { DEFAULT_MODEL, FALLBACK_MODEL_OPTIONS } from '../core/modelDefaults';
import type { FetchLike, ModelClient } from '../core/modelTransport';
import { OpenRouterTransport } from '../core/openrouterTransport';
import { type AgentLanguage, getSystemPrompt } from '../core/prompts';
import { getRepoVerificationContextNote } from '../core/repoMap';
import { RunRepository } from '../core/runRepository';
import { globalSettingsFile, safeMkdir, workspaceAistRoot, workspaceSettingsFile } from '../core/storage';
import { DefaultToolRegistry, type ToolRegistry } from '../core/toolRegistry';
import { ToolRunner, type ToolRunnerExecutionAdapter } from '../core/toolRunner';
import type {
  Chat,
  CodexServiceTier,
  JsonObject,
  JsonValue,
  ModelProvider,
  OpenRouterModelOption,
  ReasoningEffort,
  RuntimeEvent,
  ToolApprovalDecision,
  ToolPermissionMode
} from '../core/types';
import {
  DAEMON_BUSY_ERROR_CODE,
  DAEMON_EVENT_METHOD,
  DAEMON_PROTOCOL_VERSION,
  type DaemonActiveRun,
  type DaemonApprovalResolveParams,
  type DaemonApprovalResolveResult,
  type DaemonChat,
  type DaemonChatAskResult,
  type DaemonChatCompactResult,
  type DaemonChatCreateResult,
  type DaemonChatGetResult,
  type DaemonChatListResult,
  type DaemonChatSetModelResult,
  type DaemonChatStopResult,
  type DaemonConfigGetResult,
  type DaemonConfigUpdateResult,
  type DaemonEvent,
  type DaemonEventsSubscribeResult,
  type DaemonInitializeResult,
  type DaemonModelsResult,
  type DaemonState,
  type JsonRpcErrorObject,
  type JsonRpcId,
  type JsonRpcRequest,
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
const REDACTED_VALUE = '<redacted>';
const READONLY_DAEMON_TOOLS = new Set([
  'get_workspace_info',
  'outline_file',
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
  private readonly configStore: FileBackedConfigStore;
  private readonly memoryStore: AgentMemoryStore;
  private readonly toolRegistry: ToolRegistry;
  private readonly runtime: AgentRuntimeService;
  private readonly connections = new Set<DaemonConnection>();
  private readonly pendingApprovalsById = new Map<string, PendingApproval>();
  private readonly pendingApprovalsByMessageId = new Map<string, PendingApproval>();

  private server: net.Server | undefined;
  private activeRun: DaemonActiveRun | null = null;
  private startingRun = false;

  constructor(private readonly options: AistDaemonServerOptions) {
    this.workspaceRoot = path.resolve(options.workspaceRoot);
    this.homeDir = options.homeDir || os.homedir();
    this.env = options.env || process.env;
    this.now = options.now || Date.now;
    this.idFactory = options.idFactory || randomUUID;
    this.socketPath = options.socketPath || getDaemonSocketPath(this.workspaceRoot);
    this.logFilePath = path.join(workspaceAistRoot(this.workspaceRoot), 'daemon.log');
    this.logger = new DaemonFileLogger(this.logFilePath);
    this.chatRepository = new ChatRepository({ workspaceRoot: this.workspaceRoot });
    this.runRepository = new RunRepository({ workspaceRoot: this.workspaceRoot });
    this.configStore = new FileBackedConfigStore({
      workspaceRoot: this.workspaceRoot,
      homeDir: this.homeDir,
      logger: this.logger
    });
    this.memoryStore = new AgentMemoryStore(
      createMemoryStorePaths({ workspaceRoot: this.workspaceRoot, homeDir: this.homeDir })
    );
    this.toolRegistry = options.toolRegistry || new DefaultToolRegistry();
    this.runtime = this.createRuntime();
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
    const connection: DaemonConnection = { socket, buffer: '', subscribed: false };
    this.connections.add(connection);
    socket.setEncoding('utf8');
    socket.on('data', (chunk) => this.handleConnectionData(connection, chunk));
    socket.on('error', (error) => this.logger.warn('Daemon client socket error', sanitizeLogDetails(error)));
    socket.on('close', () => {
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
    let request: JsonRpcRequest;
    try {
      request = JSON.parse(line) as JsonRpcRequest;
    } catch {
      this.sendError(connection, null, createJsonRpcError(-32700, 'parse.error', 'Parse error.'));
      return;
    }

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
      case 'chat.setModel':
        return this.chatSetModel(params);
      case 'chat.compact':
        return this.chatCompact(params);
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

  private async chatCreate(params: unknown): Promise<DaemonChatCreateResult> {
    const input = asOptionalRecord(params);
    const model = optionalString(input, 'model') || (await this.resolveChatModel());
    const chat = await this.chatRepository.create({ model });
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
    await this.requireChat(chatId);
    if (this.activeRun || this.startingRun) {
      throw this.createBusyError();
    }

    this.startingRun = true;
    try {
      const result = await this.runtime.startAsk(chatId, prompt);
      if (!result.accepted) {
        throw new DaemonRpcError(-32000, result.error.code || 'run.rejected', result.error.message, {
          code: result.error.code || 'run.rejected',
          chatId
        });
      }

      this.activeRun = { runId: result.runId, chatId };
      await this.broadcastStateChanged('chat.ask');
      return {
        operationId: this.idFactory(),
        runId: result.runId,
        chatId,
        accepted: true
      };
    } finally {
      this.startingRun = false;
    }
  }

  private async chatStop(params: unknown): Promise<DaemonChatStopResult> {
    const input = asOptionalRecord(params);
    const requestedRunId = optionalString(input, 'runId');
    const runId = requestedRunId || this.activeRun?.runId;
    const stopped = Boolean(runId && this.activeRun && (!requestedRunId || requestedRunId === this.activeRun.runId));
    if (runId) {
      this.runtime.stop(runId);
    }

    await this.broadcastStateChanged('chat.stop');
    return {
      operationId: this.idFactory(),
      stopped,
      runId
    };
  }

  private async chatSetModel(params: unknown): Promise<DaemonChatSetModelResult> {
    const input = requireRecord(params, 'chat.setModel params');
    const chatId = requireString(input, 'chatId');
    const model = requireString(input, 'model');
    const chat = await this.requireChat(chatId);
    if (chat.busy || this.activeRun?.chatId === chat.id) {
      throw this.createBusyError();
    }

    const updated = await this.chatRepository.update(chat.id, { model });
    await this.broadcastStateChanged('chat.setModel');
    return {
      operationId: this.idFactory(),
      chat: toDaemonChat(updated)
    };
  }

  private async chatCompact(params: unknown): Promise<DaemonChatCompactResult> {
    const input = requireRecord(params, 'chat.compact params');
    const chat = await this.requireChat(requireString(input, 'chatId'));
    if (chat.busy || this.activeRun?.chatId === chat.id || this.startingRun) {
      throw this.createBusyError();
    }

    const keepLastMessages = optionalNumber(input, 'keepLastMessages') ?? 0;
    const summary = await this.createCompactionSummary(chat, optionalString(input, 'summary'), keepLastMessages);
    const tailMessages = selectCompactionTailMessages(chat.messages, keepLastMessages);
    const { tailHistory } = splitCompactionHistory(chat.history, keepLastMessages);
    const compactedAt = this.now();
    const compacted = await this.chatRepository.create({
      title: `${chat.title} compacted`,
      model: chat.model,
      previousChatId: chat.id,
      compactedAt,
      lastAnswer: summary,
      messages: [{ role: 'assistant', content: summary, createdAt: compactedAt }, ...tailMessages],
      history: [{ role: 'assistant', content: summary }, ...tailHistory],
      state: { busy: false }
    });
    await this.broadcastStateChanged('chat.compact');
    return {
      operationId: this.idFactory(),
      chat: toDaemonChat(compacted)
    };
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

  private createRuntime(): AgentRuntimeService {
    const modelClient = this.options.modelClient || this.createRoutingModelClient();
    return new AgentRuntimeService({
      chatRepository: createFileBackedRuntimeChatRepository(this.chatRepository),
      runRepository: this.runRepository,
      modelClient,
      toolRegistry: this.toolRegistry,
      handleToolCall: this.createToolCallHandler(),
      configProvider: {
        getSnapshot: () => this.getRuntimeConfig()
      },
      promptProvider: {
        getSystemPrompt: async () => getSystemPrompt({ language: await this.getLanguage() })
      },
      contextProviders: {
        getRepoContextNote: (inputPrompt) => getRepoVerificationContextNote(this.workspaceRoot, inputPrompt),
        getMemoryContextBlock: (inputPrompt) => getRelevantMemoryPromptBlock(this.memoryStore, inputPrompt)
      },
      modelCatalog: {
        getOption: getDaemonModelOption
      },
      skillProvider: {
        getSkills: () => []
      },
      workspaceRootProvider: {
        getWorkspaceRoot: () => this.workspaceRoot
      },
      eventSink: {
        emit: (event) => this.handleRuntimeEvent(event)
      },
      logger: this.logger,
      concurrencyScope: 'workspace',
      reflection: {
        enabled: false
      },
      hooks: {
        onRunFinished: ({ runId }) => {
          if (this.activeRun?.runId === runId) {
            this.activeRun = null;
          }
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
          getPermission: (toolName) => getDaemonToolPermission(toolName),
          requestApproval: async (request) => {
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
            workspaceRoot: this.workspaceRoot,
            workspaceName: path.basename(this.workspaceRoot)
          })
        },
        projectTools: {
          execute: (toolName, args) => this.toolRegistry.runProjectTool(toolName, args, this.workspaceRoot)
        },
        memory: {
          add: (candidate) => this.memoryStore.add(candidate)
        },
        events: params.events,
        runRepository: params.runRepository,
        workspaceRoot: this.workspaceRoot,
        getRunId: () => params.runId
      });
      await runner.handleToolCall(params);
    };
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
      activeRun: this.activeRun,
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
      activeRun: this.activeRun,
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

  private async createCompactionSummary(
    chat: Chat,
    providedSummary: string | undefined,
    keepLastMessages: number
  ): Promise<string> {
    const cleanProvidedSummary = providedSummary?.trim();
    if (cleanProvidedSummary) {
      return cleanProvidedSummary;
    }

    const { summaryHistory } = splitCompactionHistory(chat.history, keepLastMessages);
    const history = summaryHistory.length ? summaryHistory : chat.history;
    const response = await (this.options.modelClient || this.createRoutingModelClient()).chat(
      createCompactionMessages(history),
      undefined,
      chat.model
    );
    const summary = response.content?.trim();
    if (!summary) {
      throw new DaemonRpcError(-32000, 'chat.compaction.empty', 'Model returned an empty compaction summary.', {
        chatId: chat.id
      });
    }

    return summary;
  }

  private createRoutingModelClient(): ModelClient {
    return {
      chat: async (messages, tools, modelOverride, signal, stream, lifecycle) => {
        const model = modelOverride || DEFAULT_MODEL;
        const client = await this.createModelClientForModel(model);
        return client.chat(messages, tools, model, signal, stream, lifecycle);
      }
    };
  }

  private async createModelClientForModel(model: string): Promise<ModelClient> {
    if (model.startsWith('codex:')) {
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
        defaultModel: model,
        serviceTier: await this.getCodexServiceTier()
      });
    }

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
      siteUrl: await this.getStringSetting(['openrouterAgent.siteUrl', 'siteUrl']),
      siteName: (await this.getStringSetting(['openrouterAgent.siteName', 'siteName'])) || 'aist',
      reasoningEffort: await this.getReasoningEffort()
    });
  }

  private async getRuntimeConfig(): Promise<AgentRuntimeConfigSnapshot> {
    return {
      maxToolIterations: Math.max(
        0,
        Math.floor(await this.getNumberSetting(['openrouterAgent.maxToolIterations', 'maxToolIterations'], 0))
      ),
      streamingEnabled: await this.getBooleanSetting(['openrouterAgent.streamingEnabled', 'streamingEnabled'], false),
      disabledProjectToolIds: await this.getStringArraySetting([
        'openrouterAgent.projectToolDisabledIds',
        'projectToolDisabledIds'
      ])
    };
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

    const transport = new OpenRouterTransport({
      apiKey,
      fetch: this.options.fetch,
      logger: this.logger
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

  private createBusyError(): DaemonRpcError {
    return new DaemonRpcError(-32010, DAEMON_BUSY_ERROR_CODE, 'Workspace already has an active run.', {
      code: DAEMON_BUSY_ERROR_CODE,
      activeRun: this.activeRun ?? undefined
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

function getDaemonToolPermission(toolName: string): ToolPermissionMode {
  if (READONLY_DAEMON_TOOLS.has(toolName)) {
    return 'auto';
  }

  return getToolExecutionRequirement(toolName).mode === 'auto' ? 'auto' : 'ask';
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
    previousChatId: chat.previousChatId ?? null,
    compactedAt: chat.compactedAt ?? null,
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

function normalizeModelProvider(value: string): ModelProvider | 'all' {
  if (value === 'openrouter' || value === 'codex' || value === 'all') {
    return value;
  }

  throw new DaemonRpcError(-32602, 'params.invalid', 'Model provider must be openrouter, codex, or all.', {
    provider: value
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
