import type { AuxiliaryModelInvoker } from '../../entities/model/auxiliaryModel';
import { CODEX_RESPONSES_URL, OPENROUTER_URL } from '../../entities/model/modelDefaults';
import { getModelRequestErrorInfo } from '../../entities/model/modelErrors';
import type { ModelClient } from '../../entities/model/modelTransport';
import { MEMORY_TOOL_NAME, governModelContext } from '../../features/context/contextGovernor';
import {
  createEmptyUsage,
  getCallUsageFromModelUsage,
  getChatContextEstimateFromModelUsage,
  mergeUsage
} from '../../features/context/usage';
import {
  type RunReflectionOutcome,
  buildRunReflectionPrompt,
  buildRunReflectionTrace,
  parseReflectionResponse
} from '../../features/reflection/reflection';
import type { AgentSkill } from '../../features/skills/skills';
import {
  findRepeatedToolCall,
  getRepeatedToolCallAnswer,
  redactLargeArgs
} from '../../features/tool-execution/toolCalls';
import type { ToolRegistry } from '../../features/tool-execution/toolRegistry';
import {
  type ToolRunnerEventEmitter,
  type ToolRunnerMutableContext,
  type ToolRunnerRunRepository
} from '../../features/tool-execution/toolRunner';
import type {
  AgentActivityStream,
  AgentLoopResult,
  AgentReflectionCandidate,
  AgentRun,
  Chat,
  ChatContextEstimate,
  ChatMessage,
  ChatModelRequestStatus,
  ChatPlan,
  ChatUsageEstimate,
  EditorContextInput,
  JsonObject,
  JsonValue,
  ModelRequestLifecycleCallbacks,
  ModelStreamCallbacks,
  OpenRouterMessage,
  OpenRouterModelOption,
  OpenRouterTool,
  RuntimeChatMessage,
  RuntimeErrorInfo,
  RuntimeEvent,
  RuntimeRunSnapshot,
  ToolApprovalDecision,
  ToolCall
} from '../../shared/types/types';

export const MAX_MODEL_REQUEST_ATTEMPTS = 3;

export type MaybePromise<T> = T | Promise<T>;

export type AgentRuntimeConfigSnapshot = {
  maxToolIterations: number;
  streamingEnabled: boolean;
  disabledProjectToolIds?: readonly string[];
  auxiliaryModelToolEnabled?: boolean;
};

export type AgentRuntimeRunResult = { accepted: true; runId: string } | { accepted: false; error: RuntimeErrorInfo };
export type AgentRuntimeAskOptions = {
  /** Запустить модель с prompt как инструкцией, но не добавлять новый user message в чат/историю. */
  skipUserMessage?: boolean;
};

export type AgentRuntimeTelemetryStatus = 'success' | 'error' | 'stopped';

export type AgentRuntimeLogger = {
  info(message: string, details?: unknown): void;
  error?(message: string, error?: unknown): void;
};

export type AgentRuntimeChatRepository = {
  getChat(chatId: string): MaybePromise<Chat | undefined>;
  appendMessage(chatId: string, message: Omit<ChatMessage, 'id' | 'createdAt'>): MaybePromise<ChatMessage>;
  updateMessage(
    chatId: string,
    messageId: string,
    patch: Partial<Omit<ChatMessage, 'id' | 'createdAt'>>
  ): MaybePromise<ChatMessage>;
  setBusy(chatId: string, busy: boolean): MaybePromise<void>;
  setActivity(chatId: string, activity: Chat['activity'], detail?: string): MaybePromise<void>;
  setActivityDetail(chatId: string, detail: string | undefined): MaybePromise<void>;
  setModelRequest(chatId: string, modelRequest: Chat['modelRequest']): MaybePromise<void>;
  updateModelRequest(
    chatId: string,
    patch: Partial<NonNullable<Chat['modelRequest']>>
  ): MaybePromise<Chat['modelRequest'] | undefined>;
  setHistory(chatId: string, history: Chat['history']): MaybePromise<void>;
  setLastAnswer(chatId: string, answer: string): MaybePromise<void>;
  addUsage(chatId: string, usage: Partial<ChatUsageEstimate>): MaybePromise<ChatUsageEstimate>;
  setContext(chatId: string, context: ChatContextEstimate | undefined): MaybePromise<void>;
  getActivePlan(chatId: string): ChatPlan | undefined;
  setActivePlan(chatId: string, activePlan: ChatPlan): MaybePromise<void>;
  addReflectionCandidates?(chatId: string, candidates: AgentReflectionCandidate[]): MaybePromise<void>;
};

export type AgentRuntimeRunRepository = ToolRunnerRunRepository & {
  create(input: {
    id?: string;
    chatId: string;
    prompt?: string;
    model?: string;
    status?: RuntimeRunSnapshot['status'];
    startedAt?: number;
  }): Promise<{ id: string }>;
  appendEvent(runId: string, event: RuntimeEvent): Promise<void>;
  setTelemetry?(runId: string, telemetry: JsonValue): Promise<void>;
};

export type AgentRuntimeEventSink = {
  emit(event: RuntimeEvent): MaybePromise<void>;
};

export type AgentRuntimePromptProvider = {
  getSystemPrompt(): MaybePromise<string>;
};

export type AgentRuntimeContextProviders = {
  getEditorContext?(): MaybePromise<EditorContextInput | null | undefined>;
  getRepoContextNote?(prompt: string): MaybePromise<string | undefined>;
  getMemoryContextBlock?(prompt: string): MaybePromise<string | undefined>;
};

export type AgentRuntimeModelCatalog = {
  getOption(modelId: string): OpenRouterModelOption | undefined;
};

export type AgentRuntimeTelemetryHooks = {
  createRun?(chat: Chat, startedAt: number, runId: string): unknown;
  finalizeRun?(telemetry: unknown, status: AgentRuntimeTelemetryStatus): void;
  snapshot?(telemetry: unknown): JsonValue | undefined;
  recordContextBytes?(telemetry: unknown, bytes: number): void;
  recordModelRequest?(telemetry: unknown): void;
  recordModelUsage?(telemetry: unknown, usage: ChatUsageEstimate | undefined): void;
  recordToolCalls?(telemetry: unknown, toolNames: string[]): void;
  recordRepeatedToolCall?(telemetry: unknown): void;
};

export type AgentRuntimeText = {
  prepareRequest(): string;
  requestModel(): string;
  requestModelAfterTools(iteration: number): string;
  retryModelRequest(attempt: number, maxAttempts: number): string;
  finalAnswer(): string;
  modelRequestedTools(count: number): string;
  stopRequested(): string;
  reasoning(text: string): string;
  answerDraft(text: string): string;
};

export type AgentRuntimeToolCallHandlerParams = {
  chat: Chat;
  workingMessages: OpenRouterMessage[];
  toolCall: ToolCall;
  run: AgentRun<unknown>;
  runId: string;
  context: ToolRunnerMutableContext;
  events: ToolRunnerEventEmitter;
  runRepository?: ToolRunnerRunRepository;
};

export type AgentRuntimeToolCallHandler = (params: AgentRuntimeToolCallHandlerParams) => Promise<void>;

export type AgentRuntimeServiceDeps = {
  chatRepository: AgentRuntimeChatRepository;
  runRepository?: AgentRuntimeRunRepository;
  modelClient: ModelClient;
  auxiliaryModel?: AuxiliaryModelInvoker;
  toolRegistry: ToolRegistry;
  handleToolCall: AgentRuntimeToolCallHandler;
  configProvider: { getSnapshot(): MaybePromise<AgentRuntimeConfigSnapshot> };
  promptProvider: AgentRuntimePromptProvider;
  contextProviders?: AgentRuntimeContextProviders;
  modelCatalog?: AgentRuntimeModelCatalog;
  skillProvider?: { getSkills(): MaybePromise<readonly AgentSkill[]> };
  workspaceRootProvider?: { getWorkspaceRoot(): MaybePromise<string> };
  eventSink?: AgentRuntimeEventSink;
  concurrencyScope?: 'chat' | 'workspace';
  logger: AgentRuntimeLogger;
  reportError?(error: unknown, options?: { chatId?: string; context?: string; appendToChat?: boolean }): void;
  createErrorMessage?(content: string): Omit<ChatMessage, 'id' | 'createdAt'>;
  idFactory?: () => string;
  now?: () => number;
  text?: Partial<AgentRuntimeText>;
  telemetry?: AgentRuntimeTelemetryHooks;
  reflection?: {
    enabled?: boolean;
    timeoutMs?: number;
    schedule?(task: () => void): void;
  };
  hooks?: {
    onRunFinished?(result: {
      chatId: string;
      runId: string;
      status: AgentRuntimeTelemetryStatus;
      usage?: ChatUsageEstimate;
    }): MaybePromise<void>;
  };
};

type ActiveRun = {
  id: string;
  chatId: string;
  run: AgentRun<unknown>;
};

/**
 * Core agent runtime service.
 *
 * The service owns in-process run state, retry/model request status, activity
 * stream reduction and event emission. Storage, model transport, tools, context
 * and UI updates are injected as adapters so the same loop can run in tests,
 * CLI and the VS Code extension.
 */
export class AgentRuntimeService {
  private readonly activeRunsByChat = new Map<string, ActiveRun>();
  private readonly activeRunsById = new Map<string, ActiveRun>();
  private readonly now: () => number;
  private readonly idFactory: () => string;
  private readonly text: AgentRuntimeText;

  constructor(private readonly deps: AgentRuntimeServiceDeps) {
    this.now = deps.now || Date.now;
    this.idFactory = deps.idFactory || createRuntimeId;
    this.text = { ...defaultRuntimeText, ...deps.text };
  }

  async ask(chatId: string, prompt: string, options: AgentRuntimeAskOptions = {}): Promise<AgentRuntimeRunResult> {
    const acceptedRun = await this.acceptRun(chatId, prompt, options);
    if (!acceptedRun.accepted) {
      return acceptedRun;
    }

    await acceptedRun.done;
    return { accepted: true, runId: acceptedRun.runId };
  }

  async startAsk(chatId: string, prompt: string, options: AgentRuntimeAskOptions = {}): Promise<AgentRuntimeRunResult> {
    const acceptedRun = await this.acceptRun(chatId, prompt, options);
    if (!acceptedRun.accepted) {
      return acceptedRun;
    }

    void acceptedRun.done.catch((error) => {
      this.deps.logger.error?.('Agent background run failed outside runtime handler', error);
    });
    return { accepted: true, runId: acceptedRun.runId };
  }

  private async acceptRun(
    chatId: string,
    prompt: string,
    options: AgentRuntimeAskOptions
  ): Promise<{ accepted: true; runId: string; done: Promise<void> } | { accepted: false; error: RuntimeErrorInfo }> {
    const cleanPrompt = String(prompt || '').trim();
    if (!cleanPrompt) {
      return { accepted: false, error: { message: 'Prompt is empty.', code: 'run.emptyPrompt' } };
    }

    const chat = await this.requireChat(chatId);
    if (chat.busy || this.hasActiveRun(chat.id)) {
      this.deps.logger.info('Rejecting ask because chat is busy', { chatId: chat.id });
      return { accepted: false, error: { message: 'Chat already has an active run.', code: 'run.busy' } };
    }

    const startedAt = this.now();
    const runId = await this.createRunId(chat, cleanPrompt, startedAt);
    const run: AgentRun<unknown> = {
      chatId: chat.id,
      startedAt,
      prompt: cleanPrompt,
      abortController: new AbortController(),
      stopRequested: false,
      permissionResolvers: new Map(),
      telemetry: this.deps.telemetry?.createRun?.(chat, startedAt, runId)
    };
    const activeRun = { id: runId, chatId: chat.id, run };
    this.activeRunsByChat.set(chat.id, activeRun);
    this.activeRunsById.set(runId, activeRun);

    return {
      accepted: true,
      runId,
      done: scheduleRunExecution(() => this.executeAcceptedRun(chat, runId, run, cleanPrompt, options))
    };
  }

  private async executeAcceptedRun(
    chat: Chat,
    runId: string,
    run: AgentRun<unknown>,
    cleanPrompt: string,
    options: AgentRuntimeAskOptions
  ): Promise<void> {
    let reflectionOutcome: RunReflectionOutcome = { status: 'stopped' };
    let telemetryStatus: AgentRuntimeTelemetryStatus = 'success';
    try {
      await this.startRun(chat, runId, run, cleanPrompt, options);
      const initialHistory = await this.createInitialHistory(chat, cleanPrompt, options);
      const result = await this.runLoopWithRetries(chat, initialHistory, runId, run);
      const resultHistory = options.skipUserMessage
        ? removeLastSyntheticUserPrompt(result.history, cleanPrompt)
        : result.history;
      await this.deps.chatRepository.setHistory(chat.id, resultHistory);
      await this.deps.chatRepository.setLastAnswer(chat.id, result.answer);
      await this.appendMessage(runId, chat.id, {
        role: 'assistant',
        content: result.answer,
        usage: result.usage.totalTokens ? result.usage : undefined
      });
      reflectionOutcome = { status: 'success', answer: result.answer };
      await this.finishRun(chat, runId, run, 'success', result.answer, result.usage);
    } catch (error) {
      const stopped = run.stopRequested || isAbortError(error);
      telemetryStatus = stopped ? 'stopped' : 'error';
      reflectionOutcome = stopped
        ? { status: 'stopped' }
        : { status: 'error', error: formatChatErrorMessage(error, 'agent run failed') };
      const runtimeError = stopped ? undefined : toRuntimeError(error);
      await this.handleRunError(chat, runId, run, error, stopped);
      await this.finishRun(chat, runId, run, telemetryStatus, undefined, undefined, runtimeError);
    } finally {
      this.activeRunsByChat.delete(chat.id);
      this.activeRunsById.delete(runId);
      this.schedulePostRunReflection(chat.id, runId, run, reflectionOutcome);
    }
  }

  stop(runId?: string): void {
    const activeRun = runId ? this.activeRunsById.get(runId) : this.activeRunsById.values().next().value;
    if (!activeRun) {
      return;
    }

    const { run, id } = activeRun;
    run.stopRequested = true;
    run.abortController.abort();
    void this.setActivity(id, run.chatId, 'stopping', this.text.stopRequested());
    for (const resolver of run.permissionResolvers.values()) {
      resolver({ approved: false, continueAfterDeny: false });
    }
    run.permissionResolvers.clear();
  }

  resolveToolCall(messageId: string, decision: ToolApprovalDecision): void {
    for (const activeRun of this.activeRunsById.values()) {
      const resolver = activeRun.run.permissionResolvers.get(messageId);
      if (resolver) {
        resolver(decision);
        return;
      }
    }
  }

  private async createRunId(chat: Chat, prompt: string, startedAt: number): Promise<string> {
    if (!this.deps.runRepository) {
      return this.idFactory();
    }

    const run = await this.deps.runRepository.create({
      chatId: chat.id,
      prompt,
      model: chat.model,
      status: 'running',
      startedAt
    });
    return run.id;
  }

  private hasActiveRun(chatId: string): boolean {
    return this.deps.concurrencyScope === 'chat' ? this.activeRunsByChat.has(chatId) : this.activeRunsById.size > 0;
  }

  private async startRun(
    chat: Chat,
    runId: string,
    run: AgentRun<unknown>,
    prompt: string,
    options: AgentRuntimeAskOptions
  ): Promise<void> {
    this.deps.logger.info('Agent run started', {
      chatId: chat.id,
      runId,
      promptLength: prompt.length,
      skipUserMessage: options.skipUserMessage === true
    });
    await this.deps.chatRepository.setModelRequest(chat.id, undefined);
    await this.deps.chatRepository.setBusy(chat.id, true);
    await this.emit(runId, {
      type: 'run.started',
      run: this.createRunSnapshot(runId, chat, run, 'running'),
      at: this.now()
    });
    if (!options.skipUserMessage) {
      await this.appendMessage(runId, chat.id, { role: 'user', content: prompt });
    }
    await this.setActivity(runId, chat.id, 'thinking', this.text.prepareRequest());
    run.activityStream = this.createActivityStream(chat.id, runId);
  }

  private async createInitialHistory(
    chat: Chat,
    prompt: string,
    options: AgentRuntimeAskOptions
  ): Promise<OpenRouterMessage[]> {
    const memoryContextBlock = await this.deps.contextProviders?.getMemoryContextBlock?.(prompt);
    await this.appendMemoryMessageIfNeeded(chat.id, memoryContextBlock);
    const governedHistory = governModelContext({
      prompt,
      history: chat.history,
      memoryContextBlock
    }).messages;
    const initialHistory = options.skipUserMessage
      ? removeLastSyntheticUserPrompt(governedHistory, prompt)
      : governedHistory;
    await this.deps.chatRepository.setHistory(chat.id, initialHistory);
    return governedHistory;
  }

  private async appendMemoryMessageIfNeeded(chatId: string, memoryContextBlock: string | undefined): Promise<void> {
    const memoryNotes = memoryContextBlock?.trim();
    if (!memoryNotes) {
      return;
    }

    await this.deps.chatRepository.appendMessage(chatId, {
      role: 'tool',
      name: MEMORY_TOOL_NAME,
      status: 'done',
      args: { query: 'current user request' },
      result: createMemoryToolResult({ memoryNotes }),
      modelResult: createMemoryToolResult({ memoryNotes })
    });
  }

  private async runLoopWithRetries(
    chat: Chat,
    initialHistory: OpenRouterMessage[],
    runId: string,
    run: AgentRun<unknown>
  ): Promise<AgentLoopResult> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_MODEL_REQUEST_ATTEMPTS; attempt += 1) {
      this.throwIfStopped(run);
      try {
        if (attempt > 1) {
          await this.setActivity(
            runId,
            chat.id,
            'thinking',
            this.text.retryModelRequest(attempt, MAX_MODEL_REQUEST_ATTEMPTS)
          );
        }
        return await this.runLoop(chat, initialHistory, runId, run, attempt);
      } catch (error) {
        lastError = error;
        if (run.stopRequested || isAbortError(error) || !isRetryableModelRequestError(error)) {
          throw error;
        }

        this.deps.logger.error?.('Retryable model request failed', error);
        this.deps.reportError?.(error, {
          chatId: chat.id,
          context: `model request attempt ${attempt}/${MAX_MODEL_REQUEST_ATTEMPTS}`
        });

        if (attempt >= MAX_MODEL_REQUEST_ATTEMPTS) {
          throw error;
        }

        await this.updateModelRequest(runId, chat.id, {
          phase: 'retrying',
          retryable: true,
          updatedAt: this.now()
        });
      }
    }

    throw lastError;
  }

  private async runLoop(
    chat: Chat,
    initialHistory: OpenRouterMessage[],
    runId: string,
    run: AgentRun<unknown>,
    requestAttempt: number
  ): Promise<AgentLoopResult> {
    const config = withChatModelSettings(await this.getConfig(), chat.modelSettings);
    const systemPrompt = await this.deps.promptProvider.getSystemPrompt();
    const workingMessages = createWorkingMessages(systemPrompt, initialHistory);
    this.deps.telemetry?.recordContextBytes?.(run.telemetry, getContextBytes(workingMessages));
    const model = this.deps.modelCatalog?.getOption(chat.model);
    const usage = createEmptyUsage();
    const toolCallCounts = new Map<string, number>();
    let modelRequestNumber = 0;

    for (let iteration = 0; config.maxToolIterations === 0 || iteration < config.maxToolIterations; iteration += 1) {
      this.throwIfStopped(run);
      run.activityStream?.reset();
      await this.setActivity(
        runId,
        chat.id,
        'thinking',
        iteration > 0 ? this.text.requestModelAfterTools(iteration) : this.text.requestModel()
      );

      const tools = await this.refreshTools(config);
      modelRequestNumber += 1;
      const responseMessage = await this.requestModel({
        chat,
        workingMessages,
        tools,
        run,
        runId,
        usage,
        model,
        streamingEnabled: config.streamingEnabled,
        requestNumber: modelRequestNumber,
        requestAttempt
      });
      const toolCalls = Array.isArray(responseMessage.tool_calls) ? responseMessage.tool_calls : [];
      this.deps.telemetry?.recordToolCalls?.(
        run.telemetry,
        toolCalls.map((toolCall) => toolCall.function.name)
      );

      if (!toolCalls.length) {
        if (!run.activityStream?.hasContent()) {
          await this.setActivity(runId, chat.id, 'answering', getResponseDetail(responseMessage, this.text));
        }
        return finishWithAnswer(workingMessages, responseMessage.content || '', responseMessage.reasoning, usage);
      }

      const repeatedToolCall = findRepeatedToolCall(toolCalls, toolCallCounts);
      if (repeatedToolCall) {
        this.deps.telemetry?.recordRepeatedToolCall?.(run.telemetry);
        const answer = getRepeatedToolCallAnswer(repeatedToolCall);
        this.deps.logger.info('Stopping repeated tool-call loop', {
          chatId: chat.id,
          runId,
          toolName: repeatedToolCall.toolName,
          count: repeatedToolCall.count,
          args: redactLargeArgs(repeatedToolCall.args)
        });
        return finishWithAnswer(workingMessages, answer, undefined, usage);
      }

      await this.setActivity(
        runId,
        chat.id,
        'thinking',
        getResponseDetail(responseMessage, this.text, this.text.modelRequestedTools(toolCalls.length))
      );
      workingMessages.push({
        role: 'assistant',
        content: responseMessage.content || '',
        reasoning: responseMessage.reasoning,
        tool_calls: toolCalls
      });

      for (const toolCall of toolCalls) {
        this.throwIfStopped(run);
        await this.deps.handleToolCall({
          chat,
          workingMessages,
          toolCall,
          run,
          runId,
          context: this.createToolRunnerContext(runId),
          events: {
            emit: (event) => this.emit(runId, event)
          },
          runRepository: this.deps.runRepository
        });
      }

      await this.deps.chatRepository.setHistory(chat.id, getPersistableHistory(workingMessages));
    }

    return finishWithAnswer(
      workingMessages,
      'Stopped because the agent reached the tool iteration limit.',
      undefined,
      usage
    );
  }

  private async refreshTools(config: AgentRuntimeConfigSnapshot): Promise<OpenRouterTool[]> {
    const [skills, workspaceRoot] = await Promise.all([
      this.deps.skillProvider?.getSkills?.() || [],
      this.deps.workspaceRootProvider?.getWorkspaceRoot?.() || ''
    ]);
    const snapshot = await this.deps.toolRegistry.refresh({
      skills,
      workspaceRoot,
      disabledProjectToolIds: config.disabledProjectToolIds || [],
      auxiliaryModelToolEnabled: config.auxiliaryModelToolEnabled === true
    });
    return snapshot.tools;
  }

  private async requestModel(params: {
    chat: Chat;
    workingMessages: OpenRouterMessage[];
    tools: OpenRouterTool[];
    run: AgentRun<unknown>;
    runId: string;
    usage: ChatUsageEstimate;
    model: OpenRouterModelOption | undefined;
    streamingEnabled: boolean;
    requestNumber: number;
    requestAttempt: number;
  }): Promise<OpenRouterMessage> {
    const startedAt = this.now();
    this.deps.telemetry?.recordModelRequest?.(params.run.telemetry);
    const provider = params.model?.provider || (params.chat.model.startsWith('codex:') ? 'codex' : 'openrouter');
    const endpoint = provider === 'codex' ? CODEX_RESPONSES_URL : OPENROUTER_URL;
    await this.setModelRequest(params.runId, params.chat.id, {
      provider,
      model: params.chat.model,
      attempt: params.requestAttempt,
      maxAttempts: MAX_MODEL_REQUEST_ATTEMPTS,
      requestNumber: params.requestNumber,
      phase: 'sending',
      stream: params.streamingEnabled,
      startedAt,
      updatedAt: startedAt,
      endpoint,
      method: 'POST'
    });

    let streamingMarked = false;
    const markStreaming = () => {
      if (streamingMarked) {
        return;
      }

      streamingMarked = true;
      void this.updateModelRequest(params.runId, params.chat.id, {
        phase: 'streaming',
        updatedAt: this.now()
      });
    };
    const streamCallbacks =
      params.streamingEnabled && params.run.activityStream
        ? createModelRequestStreamCallbacks(params.run.activityStream, markStreaming)
        : undefined;
    const lifecycle = this.createModelRequestLifecycle(params.runId, params.chat.id, params.streamingEnabled);

    try {
      const responseMessage = await this.deps.modelClient.chat(
        params.workingMessages,
        params.tools,
        params.chat.model,
        params.run.abortController.signal,
        streamCallbacks,
        lifecycle,
        {
          reasoningEffort: params.chat.modelSettings.reasoningEffort,
          codexServiceTier: params.chat.modelSettings.codexServiceTier
        }
      );
      const finishedAt = this.now();
      await this.updateModelRequest(params.runId, params.chat.id, {
        phase: 'completed',
        updatedAt: finishedAt,
        durationMs: finishedAt - startedAt,
        retryable: false
      });

      const callUsage = getCallUsageFromModelUsage(responseMessage.usage, params.model?.pricing);
      const callContext = getChatContextEstimateFromModelUsage(responseMessage.usage, params.model);
      mergeUsage(params.usage, callUsage);
      this.deps.telemetry?.recordModelUsage?.(params.run.telemetry, callUsage);
      if (callUsage) {
        await this.deps.chatRepository.addUsage(params.chat.id, callUsage);
      }
      if (callContext) {
        await this.deps.chatRepository.setContext(params.chat.id, callContext);
      }
      await this.emit(params.runId, {
        type: 'model.response',
        runId: params.runId,
        chatId: params.chat.id,
        requestNumber: params.requestNumber,
        message: toRuntimeModelMessage(responseMessage),
        usage: responseMessage.usage,
        at: finishedAt
      });

      return responseMessage;
    } catch (error) {
      const finishedAt = this.now();
      const info = getModelRequestErrorInfo(error);
      await this.updateModelRequest(params.runId, params.chat.id, {
        phase: params.run.stopRequested ? 'aborted' : 'failed',
        updatedAt: finishedAt,
        durationMs: finishedAt - startedAt,
        endpoint: info?.endpoint || endpoint,
        method: info?.method || 'POST',
        httpStatus: info?.status,
        httpStatusText: info?.statusText,
        error: getModelRequestErrorSummary(error, info),
        responseBody: info?.responseBody,
        retryable: isRetryableModelRequestError(error)
      });
      throw error;
    }
  }

  private createModelRequestLifecycle(
    runId: string,
    chatId: string,
    streamingEnabled: boolean
  ): ModelRequestLifecycleCallbacks {
    return {
      onResponseHeaders: (info) => {
        void this.updateModelRequest(runId, chatId, {
          phase: info.status >= 400 ? 'failed' : streamingEnabled ? 'streaming' : 'receiving',
          httpStatus: info.status,
          httpStatusText: info.statusText,
          updatedAt: this.now()
        });
      }
    };
  }

  private createActivityStream(chatId: string, runId: string): AgentActivityStream {
    let reasoning = '';
    let content = '';
    let lastUpdateAt = 0;

    const flush = (force = false) => {
      const now = this.now();
      if (!force && now - lastUpdateAt < 120) {
        return;
      }

      lastUpdateAt = now;
      const reasoningPreview = normalizeActivityPreview(reasoning);
      const contentPreview = normalizeActivityPreview(content);
      if (reasoningPreview) {
        void this.setActivityDetail(runId, chatId, this.text.reasoning(reasoningPreview));
      } else if (contentPreview) {
        void this.setActivity(runId, chatId, 'answering', this.text.answerDraft(contentPreview));
      }
    };

    return {
      reset: () => {
        reasoning = '';
        content = '';
        lastUpdateAt = 0;
      },
      hasContent: () => Boolean(normalizeActivityPreview(reasoning) || normalizeActivityPreview(content)),
      onComplete: () => flush(true),
      onReasoningDelta: (delta) => {
        reasoning += delta;
        flush();
      },
      onContentDelta: (delta) => {
        content += delta;
        flush();
      }
    };
  }

  private createToolRunnerContext(runId: string): ToolRunnerMutableContext {
    return {
      appendToolMessage: (chatId, message) => this.appendMessage(runId, chatId, message),
      updateToolMessage: (chatId, messageId, patch) => this.deps.chatRepository.updateMessage(chatId, messageId, patch),
      setActivity: (chatId, activity, detail) => this.setActivity(runId, chatId, activity, detail),
      getActivePlan: (chatId) => this.deps.chatRepository.getActivePlan(chatId),
      setActivePlan: (chatId, activePlan) => this.deps.chatRepository.setActivePlan(chatId, activePlan),
      throwIfStopped: (run) => this.throwIfStopped(run)
    };
  }

  private async appendMessage(
    runId: string,
    chatId: string,
    message: Omit<ChatMessage, 'id' | 'createdAt'>
  ): Promise<ChatMessage> {
    const nextMessage = await this.deps.chatRepository.appendMessage(chatId, message);
    await this.emit(runId, {
      type: 'message.appended',
      chatId,
      message: toRuntimeChatMessage(nextMessage),
      at: this.now()
    });
    return nextMessage;
  }

  private async setActivity(runId: string, chatId: string, activity: Chat['activity'], detail?: string): Promise<void> {
    await this.deps.chatRepository.setActivity(chatId, activity, detail);
    if (activity) {
      await this.emit(runId, {
        type: 'run.activity',
        runId,
        chatId,
        activity,
        detail,
        at: this.now()
      });
    }
  }

  private async setActivityDetail(runId: string, chatId: string, detail: string | undefined): Promise<void> {
    await this.deps.chatRepository.setActivityDetail(chatId, detail);
    const chat = await this.deps.chatRepository.getChat(chatId);
    const activity = chat?.activity || 'thinking';
    await this.emit(runId, {
      type: 'run.activity',
      runId,
      chatId,
      activity,
      detail,
      at: this.now()
    });
  }

  private async setModelRequest(runId: string, chatId: string, request: ChatModelRequestStatus): Promise<void> {
    await this.deps.chatRepository.setModelRequest(chatId, request);
    await this.emit(runId, {
      type: 'model.request.updated',
      runId,
      chatId,
      request,
      at: this.now()
    });
  }

  private async updateModelRequest(
    runId: string,
    chatId: string,
    patch: Partial<ChatModelRequestStatus>
  ): Promise<void> {
    const request = await this.deps.chatRepository.updateModelRequest(chatId, patch);
    if (!request) {
      return;
    }

    await this.emit(runId, {
      type: 'model.request.updated',
      runId,
      chatId,
      request,
      at: this.now()
    });
  }

  private async handleRunError(
    chat: Chat,
    runId: string,
    run: AgentRun<unknown>,
    error: unknown,
    stopped: boolean
  ): Promise<void> {
    if (stopped) {
      await this.appendMessage(runId, chat.id, { role: 'status', marker: 'stopped' });
      this.deps.logger.info('Agent run stopped', { chatId: chat.id, runId });
      return;
    }

    const content = formatChatErrorMessage(error, 'agent run failed');
    await this.appendMessage(runId, chat.id, this.createErrorMessage(content));
    this.deps.reportError?.(error, { chatId: chat.id, context: 'agent run failed', appendToChat: false });
    this.deps.logger.error?.('Agent run failed', error);
    run.stopRequested = false;
  }

  private async finishRun(
    chat: Chat,
    runId: string,
    run: AgentRun<unknown>,
    status: AgentRuntimeTelemetryStatus,
    answer?: string,
    usage?: ChatUsageEstimate,
    error?: RuntimeErrorInfo
  ): Promise<void> {
    this.deps.telemetry?.finalizeRun?.(run.telemetry, status);
    const telemetrySnapshot = this.deps.telemetry?.snapshot?.(run.telemetry);
    if (telemetrySnapshot !== undefined) {
      await this.deps.runRepository?.setTelemetry?.(runId, telemetrySnapshot);
    }

    await this.setActivity(runId, chat.id, undefined);
    await this.deps.chatRepository.setBusy(chat.id, false);
    const snapshotChat = (await this.deps.chatRepository.getChat(chat.id)) || chat;
    if (status === 'success' || status === 'stopped') {
      await this.emit(runId, {
        type: 'run.finished',
        run: this.createRunSnapshot(runId, snapshotChat, run, status === 'success' ? 'completed' : 'stopped', usage),
        status: status === 'success' ? 'completed' : 'stopped',
        answer,
        usage,
        reason: status === 'stopped' ? 'Stopped by user.' : undefined,
        at: this.now()
      });
    } else if (error) {
      await this.emit(runId, {
        type: 'run.error',
        runId,
        chatId: chat.id,
        error,
        at: this.now()
      });
    }
    await this.deps.hooks?.onRunFinished?.({ chatId: chat.id, runId, status, usage });
    this.deps.logger.info('Agent run finished', { chatId: chat.id, runId, status });
  }

  private createRunSnapshot(
    runId: string,
    chat: Chat,
    run: AgentRun<unknown>,
    status: RuntimeRunSnapshot['status'],
    usage?: ChatUsageEstimate
  ): RuntimeRunSnapshot {
    return {
      id: runId,
      chatId: chat.id,
      status,
      prompt: run.prompt,
      startedAt: run.startedAt,
      finishedAt:
        status === 'running' || status === 'waitingForApproval' || status === 'stopping' ? undefined : this.now(),
      activity: chat.activity,
      activityDetail: chat.activityDetail,
      model: chat.model,
      usage
    };
  }

  private schedulePostRunReflection(
    chatId: string,
    runId: string,
    run: AgentRun<unknown>,
    outcome: RunReflectionOutcome
  ): void {
    if (run.stopRequested || outcome.status === 'stopped' || this.deps.reflection?.enabled !== true) {
      return;
    }

    const schedule = this.deps.reflection.schedule || ((task: () => void) => setTimeout(task, 0));
    schedule(() => {
      void this.runPostRunReflection(chatId, runId, run, outcome);
    });
  }

  private async runPostRunReflection(
    chatId: string,
    runId: string,
    run: AgentRun<unknown>,
    outcome: RunReflectionOutcome
  ): Promise<void> {
    const chat = await this.deps.chatRepository.getChat(chatId);
    if (!chat) {
      return;
    }

    const trace = buildRunReflectionTrace({
      chat,
      runStartedAt: run.startedAt,
      task: run.prompt,
      outcome
    });
    if (!trace.tools.length && !trace.errors.length && !trace.approvalFeedback.length && !trace.changedFiles.length) {
      return;
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), this.deps.reflection?.timeoutMs || 30_000);
    try {
      const response = await this.deps.modelClient.chat(
        [
          {
            role: 'system',
            content:
              'You are AIST post-run reflection. Produce only safe JSON candidates for user review. Never call tools.'
          },
          { role: 'user', content: buildRunReflectionPrompt(trace) }
        ],
        undefined,
        chat.model,
        abortController.signal
      );
      const candidates = parseReflectionResponse(response.content || '');
      if (candidates.length) {
        await this.deps.chatRepository.addReflectionCandidates?.(chatId, candidates);
        await this.emit(runId, {
          type: 'chat.updated',
          chatId,
          reason: 'reflection.candidates',
          at: this.now()
        });
      }
    } catch (error) {
      this.deps.logger.info('Post-run reflection skipped', {
        chatId,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private createErrorMessage(content: string): Omit<ChatMessage, 'id' | 'createdAt'> {
    return this.deps.createErrorMessage ? this.deps.createErrorMessage(content) : { role: 'error', content };
  }

  private async getConfig(): Promise<AgentRuntimeConfigSnapshot> {
    const snapshot = await this.deps.configProvider.getSnapshot();
    return {
      maxToolIterations: Number.isFinite(snapshot.maxToolIterations)
        ? Math.max(0, Math.floor(snapshot.maxToolIterations))
        : 0,
      streamingEnabled: Boolean(snapshot.streamingEnabled),
      disabledProjectToolIds: snapshot.disabledProjectToolIds || [],
      auxiliaryModelToolEnabled: snapshot.auxiliaryModelToolEnabled === true
    };
  }

  private async requireChat(chatId: string): Promise<Chat> {
    const chat = await this.deps.chatRepository.getChat(chatId);
    if (!chat) {
      throw new Error(`Chat not found: ${chatId}`);
    }
    return chat;
  }

  private throwIfStopped(run: AgentRun<unknown>): void {
    if (run.stopRequested) {
      throw new Error('Stopped by user.');
    }
  }

  private async emit(runId: string, event: RuntimeEvent): Promise<void> {
    await this.deps.runRepository?.appendEvent(runId, event);
    await this.deps.eventSink?.emit(event);
  }
}

export function getPersistableHistory(messages: OpenRouterMessage[]): OpenRouterMessage[] {
  return messages.filter((message) => message.role !== 'system');
}

export function isAbortError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'name' in error && error.name === 'AbortError');
}

export function formatChatErrorMessage(error: unknown, context?: string): string {
  const message = getErrorMessage(error);
  const title = context ? `AIST error (${context})` : 'AIST error';
  return [`**${title}**`, '', message].join('\n');
}

export function isRetryableModelRequestError(error: unknown): boolean {
  if (isAbortError(error)) {
    return false;
  }

  const requestInfo = getModelRequestErrorInfo(error);
  if (requestInfo?.status) {
    if ([400, 401, 403, 404].includes(requestInfo.status)) {
      return false;
    }

    if ([408, 409, 425, 429, 500, 502, 503, 504].includes(requestInfo.status)) {
      return true;
    }
  }

  const message = getErrorMessage(error).toLowerCase();
  if (
    message.includes('set openrouteragent.apikey') ||
    message.includes('login chatgpt codex') ||
    message.includes('authorization') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('invalid api key') ||
    message.includes('400 bad request') ||
    message.includes('401 unauthorized') ||
    message.includes('403 forbidden') ||
    message.includes('404 not found')
  ) {
    return false;
  }

  return (
    message.includes('failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('terminated') ||
    message.includes('network') ||
    message.includes('socket') ||
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('enotfound') ||
    message.includes('eai_again') ||
    message.includes('stream failed') ||
    message.includes('empty response') ||
    /\b(408|409|425|429|500|502|503|504)\b/.test(message)
  );
}

function createWorkingMessages(systemPrompt: string, initialHistory: OpenRouterMessage[]): OpenRouterMessage[] {
  return [{ role: 'system', content: systemPrompt }, ...initialHistory.filter((message) => message.role !== 'system')];
}

function createMemoryToolResult(input: { memoryNotes: string }): Record<string, unknown> {
  return {
    ok: true,
    source: 'user-approved-memory',
    policy:
      'Use these notes only when they fit the current task. They are lower priority than system, developer, and explicit user instructions.',
    notes: input.memoryNotes
  };
}

function removeLastSyntheticUserPrompt(messages: OpenRouterMessage[], prompt: string): OpenRouterMessage[] {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message.role === 'user' && message.content === prompt) {
      return [...messages.slice(0, index), ...messages.slice(index + 1)];
    }
  }

  return messages;
}

function scheduleRunExecution(task: () => Promise<void>): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      void task().then(resolve, reject);
    }, 0);
  });
}

function withChatModelSettings(
  config: AgentRuntimeConfigSnapshot,
  settings: Chat['modelSettings']
): AgentRuntimeConfigSnapshot {
  return {
    ...config,
    maxToolIterations: Math.max(0, Math.floor(Number(settings.maxToolIterations) || 0)),
    streamingEnabled: settings.streamingEnabled === true
  };
}

function getContextBytes(messages: OpenRouterMessage[]): number {
  return Buffer.byteLength(
    JSON.stringify(
      messages.map((message) => ({
        role: message.role,
        content: message.content,
        reasoning: message.reasoning,
        tool_calls: message.tool_calls,
        tool_call_id: message.tool_call_id
      }))
    ),
    'utf8'
  );
}

function getResponseDetail(message: OpenRouterMessage, text: AgentRuntimeText, fallback = text.finalAnswer()): string {
  const reasoning = normalizeText(message.reasoning);
  if (reasoning) {
    return text.reasoning(truncateDetail(reasoning));
  }

  const content = normalizeText(message.content);
  if (content) {
    return text.answerDraft(truncateDetail(content));
  }

  return fallback;
}

function createModelRequestStreamCallbacks(
  activityStream: AgentActivityStream,
  onStreamStart: () => void
): ModelStreamCallbacks {
  return {
    onComplete: () => activityStream.onComplete?.(),
    onReasoningDelta: (delta) => {
      onStreamStart();
      activityStream.onReasoningDelta?.(delta);
    },
    onContentDelta: (delta) => {
      onStreamStart();
      activityStream.onContentDelta?.(delta);
    }
  };
}

function getModelRequestErrorSummary(error: unknown, info: ReturnType<typeof getModelRequestErrorInfo>): string {
  if (info?.message) {
    return info.message;
  }

  if (info?.status) {
    return `HTTP ${info.status}${info.statusText ? ` ${info.statusText}` : ''}`;
  }

  return getErrorMessage(error);
}

function finishWithAnswer(
  workingMessages: OpenRouterMessage[],
  answer: string,
  reasoning: OpenRouterMessage['reasoning'],
  usage: ChatUsageEstimate
): AgentLoopResult {
  workingMessages.push({ role: 'assistant', content: answer, reasoning });

  return {
    answer,
    history: getPersistableHistory(workingMessages),
    usage
  };
}

function toRuntimeModelMessage(message: OpenRouterMessage) {
  return {
    ...message,
    tool_calls: message.tool_calls?.map((toolCall) => ({
      ...toolCall,
      function: {
        ...toolCall.function,
        arguments:
          typeof toolCall.function.arguments === 'object'
            ? toJsonObject(toolCall.function.arguments as Record<string, unknown>)
            : toolCall.function.arguments
      }
    }))
  };
}

function toRuntimeChatMessage(message: ChatMessage): RuntimeChatMessage {
  return {
    ...message,
    args: message.args ? toJsonObject(message.args) : undefined,
    result: message.result ? toJsonObject(message.result) : undefined,
    modelResult: message.modelResult ? toJsonObject(message.modelResult) : undefined
  };
}

function toRuntimeError(error: unknown): RuntimeErrorInfo {
  return {
    message: getErrorMessage(error),
    code: getModelRequestErrorInfo(error)?.status ? String(getModelRequestErrorInfo(error)?.status) : undefined,
    stack: error instanceof Error ? error.stack : undefined
  };
}

function toJsonObject(value: Record<string, unknown>): JsonObject {
  const result: JsonObject = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = toJsonValue(item);
  }
  return result;
}

function toJsonValue(value: unknown): JsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item) ?? null);
  }
  if (value && typeof value === 'object') {
    return toJsonObject(value as Record<string, unknown>);
  }
  return String(value);
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function truncateDetail(value: string): string {
  return value.length > 220 ? `${value.slice(0, 217).trimEnd()}...` : value;
}

function normalizeActivityPreview(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 260) {
    return normalized;
  }

  return normalized.slice(-260).trimStart();
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function createRuntimeId(): string {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const defaultRuntimeText: AgentRuntimeText = {
  prepareRequest: () => 'Preparing model request.',
  requestModel: () => 'Requesting model response.',
  requestModelAfterTools: (iteration) => `Requesting model response after tool results (${iteration}).`,
  retryModelRequest: (attempt, maxAttempts) =>
    `Retrying model request (${attempt}/${maxAttempts}) after a connection error.`,
  finalAnswer: () => 'Preparing final answer.',
  modelRequestedTools: (count) => `Model requested ${count} tool call${count === 1 ? '' : 's'}.`,
  stopRequested: () => 'Stop requested. Aborting the model request and denying pending approvals.',
  reasoning: (text) => `Reasoning: ${text}`,
  answerDraft: (text) => `Answer draft: ${text}`
};
