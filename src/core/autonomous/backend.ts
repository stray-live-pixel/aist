import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { CodexAuthSessionProvider } from '../codexAuth';
import { CodexResponsesTransport } from '../codexTransport';
import {
  type ConfigStoreLogger,
  FileBackedConfigStore,
  FileSecretStore,
  OPENROUTER_API_KEY_SECRET_KEY
} from '../config';
import { DEFAULT_MODEL } from '../modelDefaults';
import type { FetchLike, ModelClient, ModelTransportLogger } from '../modelTransport';
import { OpenRouterTransport } from '../openrouterTransport';
import type { CodexServiceTier, JsonValue, ReasoningEffort } from '../types';
import { runAutonomousBatch } from './batch/runBatch';
import { discoverAutonomousDefinitions, importLegacyDefinitions } from './discovery';
import { createAutonomousEngineRegistry } from './engines/registry';
import type { AutonomousEngineRegistry } from './engines/types';
import { createSessionId, runAutonomousFlow } from './flow/orchestrator';
import {
  type CreateAutonomousFlowInput,
  type EditableAutonomousFlowDefinition,
  createAutonomousFlowDefinition,
  deleteAutonomousFlowDefinition,
  saveAutonomousFlowDefinition
} from './flowDefinitionWriter';
import { buildAutonomousState } from './presenter';
import { AutonomousSessionStore } from './storage/sessionStore';
import type {
  AutonomousEvent,
  AutonomousLaunchOptions,
  AutonomousSessionKind,
  AutonomousSessionStatus,
  AutonomousSessionView,
  AutonomousState
} from './types';

export type AutonomousBackendLogger = ConfigStoreLogger & ModelTransportLogger;

export type AutonomousBackendOptions = {
  readonly workspaceRoot: string;
  readonly workspaceName?: string;
  readonly homeDir?: string;
  readonly env?: Record<string, string | undefined>;
  readonly fetch?: FetchLike;
  readonly modelClient?: ModelClient;
  readonly logger?: AutonomousBackendLogger;
  readonly now?: () => number;
  readonly idFactory?: () => string;
};

export type AutonomousBackendEvent =
  | {
      readonly type: 'autonomous.event';
      readonly workspaceRoot: string;
      readonly sessionId: string;
      readonly event: AutonomousEvent;
    }
  | {
      readonly type: 'autonomous.state.changed';
      readonly workspaceRoot: string;
      readonly reason: string;
      readonly sessionId?: string;
      readonly at: number;
    }
  | {
      readonly type: 'autonomous.session.started';
      readonly workspaceRoot: string;
      readonly sessionId: string;
      readonly kind: AutonomousSessionKind;
      readonly targetId: string;
      readonly at: number;
    }
  | {
      readonly type: 'autonomous.session.finished';
      readonly workspaceRoot: string;
      readonly sessionId: string;
      readonly status: AutonomousSessionStatus;
      readonly at: number;
    };

export type AutonomousStartResult = {
  readonly operationId: string;
  readonly accepted: true;
  readonly sessionId: string;
  readonly kind: AutonomousSessionKind;
  readonly targetId: string;
};

export type AutonomousStopResult = {
  readonly operationId: string;
  readonly stopped: boolean;
  readonly sessionId: string;
};

export type AutonomousExportFormat = 'markdown' | 'json';

export type AutonomousExportResult = {
  readonly operationId: string;
  readonly sessionId: string;
  readonly format: AutonomousExportFormat;
  readonly content: string;
};

const OPENROUTER_ENV_KEY = 'OPENROUTER_API_KEY';

const noopLogger: AutonomousBackendLogger = {
  warn: (): void => {},
  info: (): void => {},
  error: (): void => {}
};

export class AutonomousBackend {
  readonly workspaceRoot: string;
  readonly workspaceName: string;
  readonly sessionStore: AutonomousSessionStore;

  private readonly homeDir?: string;
  private readonly env: Record<string, string | undefined>;
  private readonly fetch?: FetchLike;
  private readonly modelClient?: ModelClient;
  private readonly logger: AutonomousBackendLogger;
  private readonly now: () => number;
  private readonly idFactory: () => string;
  private readonly configStore: FileBackedConfigStore;
  private readonly secretStore: FileSecretStore;
  private readonly listeners = new Set<(event: AutonomousBackendEvent) => void>();
  private readonly runningSessions = new Map<string, AbortController>();
  private readonly completions = new Map<string, Promise<AutonomousSessionView>>();

  constructor(options: AutonomousBackendOptions) {
    this.workspaceRoot = path.resolve(options.workspaceRoot);
    this.workspaceName = options.workspaceName || path.basename(this.workspaceRoot);
    this.homeDir = options.homeDir;
    this.env = options.env || {};
    this.fetch = options.fetch;
    this.modelClient = options.modelClient;
    this.logger = options.logger || noopLogger;
    this.now = options.now || Date.now;
    this.idFactory = options.idFactory || randomUUID;
    this.configStore = new FileBackedConfigStore({
      workspaceRoot: this.workspaceRoot,
      homeDir: this.homeDir,
      logger: this.logger
    });
    this.secretStore = new FileSecretStore({ homeDir: this.homeDir, logger: this.logger });
    this.sessionStore = new AutonomousSessionStore(this.workspaceRoot, {
      onEvent: (sessionId, event) => {
        this.emit({ type: 'autonomous.event', workspaceRoot: this.workspaceRoot, sessionId, event });
      }
    });
  }

  onEvent(listener: (event: AutonomousBackendEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async getState(): Promise<AutonomousState> {
    return buildAutonomousState({
      workspaceRoot: this.workspaceRoot,
      workspaceName: this.workspaceName,
      engineRegistry: this.createEngineRegistry()
    });
  }

  async importLegacyDefinitions(): Promise<AutonomousState> {
    await importLegacyDefinitions(this.workspaceRoot);
    this.emitStateChanged('autonomous.importLegacy');
    return this.getState();
  }

  async createFlow(input: CreateAutonomousFlowInput): Promise<EditableAutonomousFlowDefinition> {
    const flow = await createAutonomousFlowDefinition(this.workspaceRoot, input);
    this.emitStateChanged('autonomous.createFlow');
    return flow;
  }

  async saveFlow(flow: EditableAutonomousFlowDefinition): Promise<void> {
    await saveAutonomousFlowDefinition(this.workspaceRoot, flow);
    this.emitStateChanged('autonomous.saveFlow');
  }

  async deleteFlow(flowId: string): Promise<void> {
    await deleteAutonomousFlowDefinition(this.workspaceRoot, flowId);
    this.emitStateChanged('autonomous.deleteFlow');
  }

  async startFlow(flowId: string, launch: AutonomousLaunchOptions): Promise<AutonomousStartResult> {
    const definitions = await discoverAutonomousDefinitions({ workspaceRoot: this.workspaceRoot });
    const flow = definitions.flows.find((candidate) => candidate.id === flowId);
    if (!flow) {
      throw new Error(`Unknown autonomous flow: ${flowId}`);
    }

    const sessionId = createSessionId('flow');
    const abortController = new AbortController();
    this.runningSessions.set(sessionId, abortController);
    const workDir = launch.workDir || this.workspaceRoot;
    const completion = runAutonomousFlow({
      flow,
      workspaceRoot: this.workspaceRoot,
      workDir,
      launch,
      sessionStore: this.sessionStore,
      engineRegistry: this.createEngineRegistry(),
      signal: abortController.signal,
      sessionId
    })
      .then(() => this.sessionStore.readSession(sessionId))
      .finally(() => {
        this.runningSessions.delete(sessionId);
        return this.emitFinished(sessionId);
      });

    this.completions.set(sessionId, completion);
    completion.then(
      () => this.completions.delete(sessionId),
      () => this.completions.delete(sessionId)
    );
    this.emitStarted(sessionId, 'flow', flowId);
    return {
      operationId: this.idFactory(),
      accepted: true,
      sessionId,
      kind: 'flow',
      targetId: flowId
    };
  }

  async startRun(runId: string, launch: AutonomousLaunchOptions): Promise<AutonomousStartResult> {
    const definitions = await discoverAutonomousDefinitions({ workspaceRoot: this.workspaceRoot });
    const run = definitions.runs.find((candidate) => candidate.id === runId);
    if (!run) {
      throw new Error(`Unknown autonomous run: ${runId}`);
    }

    const sessionId = createSessionId('run');
    const abortController = new AbortController();
    this.runningSessions.set(sessionId, abortController);
    const completion = runAutonomousBatch({
      run,
      definitions,
      workspaceRoot: this.workspaceRoot,
      launch: { ...launch, workDir: launch.workDir || run.workDir || this.workspaceRoot },
      sessionStore: this.sessionStore,
      engineRegistry: this.createEngineRegistry(),
      signal: abortController.signal,
      sessionId
    })
      .then(() => this.sessionStore.readSession(sessionId))
      .finally(() => {
        this.runningSessions.delete(sessionId);
        return this.emitFinished(sessionId);
      });

    this.completions.set(sessionId, completion);
    completion.then(
      () => this.completions.delete(sessionId),
      () => this.completions.delete(sessionId)
    );
    this.emitStarted(sessionId, 'run', runId);
    return {
      operationId: this.idFactory(),
      accepted: true,
      sessionId,
      kind: 'run',
      targetId: runId
    };
  }

  stop(sessionId: string): AutonomousStopResult {
    const controller = this.runningSessions.get(sessionId);
    if (controller) {
      controller.abort();
      this.emitStateChanged('autonomous.stop', sessionId);
    }

    return {
      operationId: this.idFactory(),
      stopped: Boolean(controller),
      sessionId
    };
  }

  async waitForSession(sessionId: string): Promise<AutonomousSessionView> {
    const completion = this.completions.get(sessionId);
    if (completion) {
      return completion;
    }

    return this.sessionStore.readSession(sessionId);
  }

  async exportSession(sessionId: string, format: AutonomousExportFormat = 'markdown'): Promise<AutonomousExportResult> {
    const content =
      format === 'json'
        ? `${JSON.stringify(await this.sessionStore.readSession(sessionId, Number.MAX_SAFE_INTEGER), null, 2)}\n`
        : await this.sessionStore.exportMarkdown(sessionId);
    return {
      operationId: this.idFactory(),
      sessionId,
      format,
      content
    };
  }

  dispose(): void {
    for (const controller of this.runningSessions.values()) {
      controller.abort();
    }
    this.runningSessions.clear();
    this.listeners.clear();
  }

  private createEngineRegistry(): AutonomousEngineRegistry {
    const injected = this.modelClient;
    return createAutonomousEngineRegistry({
      openRouterClient: injected || this.createOpenRouterEngineClient(),
      codexClient: injected || this.createCodexEngineClient()
    });
  }

  private createOpenRouterEngineClient(): ModelClient {
    return {
      chat: async (messages, tools, modelOverride, signal, stream, lifecycle) => {
        const apiKey = await this.getOpenRouterApiKey();
        if (!apiKey) {
          throw new Error(
            `OpenRouter API key is not configured. Set ${OPENROUTER_ENV_KEY} or store a global auth secret.`
          );
        }

        const transport = new OpenRouterTransport({
          apiKey,
          fetch: this.fetch,
          logger: this.logger,
          siteUrl: await this.getStringSetting(['openrouterAgent.siteUrl', 'siteUrl']),
          siteName: (await this.getStringSetting(['openrouterAgent.siteName', 'siteName'])) || 'aist',
          reasoningEffort: await this.getReasoningEffort()
        });
        return transport.chat(
          messages,
          tools,
          modelOverride || (await this.getDefaultModel()),
          signal,
          stream,
          lifecycle
        );
      }
    };
  }

  private createCodexEngineClient(): ModelClient {
    return {
      chat: async (messages, tools, modelOverride, signal, stream, lifecycle) => {
        const authProvider = new CodexAuthSessionProvider(this.secretStore, {
          fetch: this.fetch,
          logger: this.logger
        });
        if (!(await authProvider.isAuthenticated())) {
          throw new Error('ChatGPT Codex auth is not configured. Login through the VS Code extension first.');
        }

        const transport = new CodexResponsesTransport({
          tokenProvider: authProvider,
          fetch: this.fetch,
          logger: this.logger,
          defaultModel: modelOverride || (await this.getDefaultModel()),
          serviceTier: await this.getCodexServiceTier()
        });
        return transport.chat(messages, tools, modelOverride, signal, stream, lifecycle);
      }
    };
  }

  private async getDefaultModel(): Promise<string> {
    const configured = await this.configStore.get<JsonValue>('model', DEFAULT_MODEL);
    return typeof configured === 'string' && configured.trim() ? configured : DEFAULT_MODEL;
  }

  private async getOpenRouterApiKey(): Promise<string | undefined> {
    return this.env[OPENROUTER_ENV_KEY] || this.secretStore.get(OPENROUTER_API_KEY_SECRET_KEY);
  }

  private async getStringSetting(keys: readonly string[]): Promise<string | undefined> {
    for (const key of keys) {
      const value = await this.configStore.get<JsonValue>(key);
      if (typeof value === 'string') {
        return value;
      }
    }
    return undefined;
  }

  private async getReasoningEffort(): Promise<ReasoningEffort> {
    const value = await this.getStringSetting(['openrouterAgent.reasoningEffort', 'reasoningEffort']);
    return value === 'low' || value === 'medium' || value === 'high' ? value : 'auto';
  }

  private async getCodexServiceTier(): Promise<CodexServiceTier> {
    const value = await this.getStringSetting(['openrouterAgent.codexServiceTier', 'codexServiceTier']);
    return value === 'priority' ? 'priority' : 'auto';
  }

  private emitStarted(sessionId: string, kind: AutonomousSessionKind, targetId: string): void {
    this.emit({
      type: 'autonomous.session.started',
      workspaceRoot: this.workspaceRoot,
      sessionId,
      kind,
      targetId,
      at: this.now()
    });
    this.emitStateChanged('autonomous.start', sessionId);
  }

  private async emitFinished(sessionId: string): Promise<void> {
    let status: AutonomousSessionStatus = 'finished';
    try {
      status = (await this.sessionStore.readSession(sessionId, 0)).meta.status;
    } catch {
      status = 'error';
    }

    this.emit({
      type: 'autonomous.session.finished',
      workspaceRoot: this.workspaceRoot,
      sessionId,
      status,
      at: this.now()
    });
    this.emitStateChanged('autonomous.finish', sessionId);
  }

  private emitStateChanged(reason: string, sessionId?: string): void {
    this.emit({
      type: 'autonomous.state.changed',
      workspaceRoot: this.workspaceRoot,
      reason,
      sessionId,
      at: this.now()
    });
  }

  private emit(event: AutonomousBackendEvent): void {
    for (const listener of [...this.listeners]) {
      listener(event);
    }
  }
}
