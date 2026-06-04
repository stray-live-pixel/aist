import fs from 'node:fs';
import path from 'node:path';

import type { AuxiliaryModelInvoker } from '../../../core/entities/model/auxiliaryModel';
import { appendJsonl, globalWorkspaceRoot, safeMkdir, writeJsonAtomic } from '../../../core/entities/storage/storage';
import {
  type AutonomousEvent,
  type AutonomousFlowDefinition,
  type AutonomousFlowState,
  type AutonomousSessionStatus,
  AutonomousSessionStore,
  createSessionId,
  discoverAutonomousDefinitions,
  runAutonomousFlow
} from '../../../core/processes/autonomous';
import type {
  DaemonIsolationEvent,
  DaemonIsolationStartParams,
  IsolationFlowSelection,
  IsolationProviderKind,
  IsolationRemoteServerInput,
  IsolationRemoteServerSettings,
  IsolationRunnerSummary,
  IsolationSessionStatus,
  IsolationSessionSummary
} from '../../daemonProtocol';
import { finalizeContainerWorkspace } from './container/finalizeContainerWorkspace';
import { prepareContainerWorkspace } from './container/prepareContainerWorkspace';
import type { IsolationExecutionProvider } from './IsolationExecutionProvider';
import { LocalDockerIsolationProvider } from './LocalDockerIsolationProvider';
import {
  ISOLATED_AGENT_ENGINE_ID,
  type IsolatedAgentAutonomousEngineRunInput,
  createIsolatedAgentAutonomousEngine
} from './flow/createIsolatedAgentAutonomousEngine';
import { IsolationGitService } from './git/IsolationGitService';
import { IsolationRemoteServerStore } from './remote/IsolationRemoteServerStore';
import { RemoteSshIsolationProvider } from './remote/RemoteSshIsolationProvider';

export type IsolationAgentRunInput = IsolatedAgentAutonomousEngineRunInput;

type IsolationSessionManagerOptions = {
  readonly workspaceRoot: string;
  readonly homeDir: string;
  readonly env: Record<string, string | undefined>;
  readonly auxiliaryModel?: AuxiliaryModelInvoker;
  readonly now: () => number;
  readonly idFactory: () => string;
  readonly emit: (event: DaemonIsolationEvent) => void;
  /** Создаёт обычный чат, куда isolated runtime будет писать live-сообщения и tool-calls. */
  readonly createChat: (input: { chatId: string; prompt: string }) => Promise<void>;
  readonly runAgent: (input: IsolationAgentRunInput) => Promise<{ runId?: string; answer?: string }>;
};

/**
 * Detached session state for isolated agents.
 *
 * The manager persists session summaries and event logs so VS Code can close,
 * reconnect later, and still reconstruct the current container/session status.
 */
export class IsolationSessionManager {
  private readonly dockerProvider: LocalDockerIsolationProvider;
  private readonly gitService: IsolationGitService;
  private readonly remoteServerStore: IsolationRemoteServerStore;
  private readonly sessionsFile: string;
  private readonly eventsDir: string;

  private readonly stopHandlers = new Map<string, () => void>();
  private sessions = new Map<string, IsolationSessionSummary>();

  constructor(private readonly options: IsolationSessionManagerOptions) {
    const root = path.join(globalWorkspaceRoot(options.workspaceRoot, options.homeDir), 'isolation');
    this.sessionsFile = path.join(root, 'sessions.json');
    this.eventsDir = path.join(root, 'events');
    this.dockerProvider = new LocalDockerIsolationProvider({ env: options.env });
    this.gitService = new IsolationGitService({
      workspaceRoot: options.workspaceRoot,
      worktreesRoot: path.join(root, 'legacy-worktrees'),
      env: options.env,
      auxiliaryModel: options.auxiliaryModel
    });
    this.remoteServerStore = new IsolationRemoteServerStore({
      homeDir: options.homeDir,
      now: options.now,
      idFactory: options.idFactory
    });
    this.load();
  }

  list(): readonly IsolationSessionSummary[] {
    return [...this.sessions.values()].sort((left, right) => right.updatedAt - left.updatedAt);
  }

  get(sessionId: string): IsolationSessionSummary | null {
    return this.sessions.get(sessionId) || null;
  }

  async start(params: DaemonIsolationStartParams): Promise<IsolationSessionSummary> {
    const prompt = params.prompt.trim();
    if (!prompt) {
      throw new Error('Isolation prompt must not be empty.');
    }
    const flow = await this.getFlow(params.flowId);
    const provider = normalizeProvider(params.provider, params.runnerId);
    const runnerId = params.runnerId?.trim() || undefined;
    if (provider === 'remote-server') {
      if (!runnerId) {
        throw new Error('Remote runner must be selected.');
      }
      const activeSessionId = findActiveSessionForRunner({ sessions: this.sessions.values(), runnerId });
      if (activeSessionId) {
        throw new Error(`Remote runner is busy with isolated session ${activeSessionId}.`);
      }
    }

    const taskId = this.options.idFactory();
    const sessionId = this.options.idFactory();
    const chatId = `isolation-${sessionId}`;
    const now = this.options.now();
    await this.options.createChat({ chatId, prompt });
    const session: IsolationSessionSummary = {
      sessionId,
      taskId,
      chatId,
      prompt,
      flow: flow ? toInitialFlowSelection(flow) : undefined,
      branchName: `aist/task/${taskId.slice(0, 12)}`,
      baseRef: params.baseRef?.trim() || undefined,
      provider,
      runnerId,
      status: 'queued',
      attempt: 1,
      createdAt: now,
      updatedAt: now
    };

    await this.saveSession(session);
    await this.emit({ type: 'isolation.session.created', session, at: now });
    void this.provision(session.sessionId);
    return session;
  }

  async continue(sessionId: string, prompt: string, flowId?: string): Promise<IsolationSessionSummary> {
    const existing = this.requireSession(sessionId);
    const nextPrompt = prompt.trim();
    if (!nextPrompt) {
      throw new Error('Isolation continue prompt must not be empty.');
    }
    const flow = await this.getFlow(flowId ?? existing.flow?.flowId);

    const chatId = existing.chatId || `isolation-${existing.sessionId}`;
    if (!existing.chatId) {
      await this.options.createChat({ chatId, prompt: nextPrompt });
    }

    const session = await this.updateSession(existing.sessionId, {
      chatId,
      prompt: nextPrompt,
      flow: flow ? toInitialFlowSelection(flow) : undefined,
      attempt: existing.attempt + 1,
      status: 'queued',
      error: undefined,
      containerId: undefined,
      containerName: undefined
    });
    await this.log(sessionId, 'info', `Continue requested for ${session.branchName}.`);
    void this.provision(session.sessionId);
    return session;
  }

  async stop(sessionId: string): Promise<IsolationSessionSummary | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    await this.updateSession(sessionId, { status: 'stopping' });
    this.stopHandlers.get(sessionId)?.();
    await this.destroyContainer(session);
    return this.updateSession(sessionId, { status: 'destroyed', containerId: undefined, containerName: undefined });
  }

  async destroy(sessionId: string): Promise<IsolationSessionSummary | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    await this.updateSession(sessionId, { status: 'stopping' });
    this.stopHandlers.get(sessionId)?.();
    await this.destroyContainer(session);
    this.stopHandlers.delete(sessionId);
    const destroyed = await this.updateSession(sessionId, {
      status: 'destroyed',
      containerId: undefined,
      containerName: undefined,
      worktreePath: undefined
    });
    await this.emit({ type: 'isolation.session.destroyed', session: destroyed, at: this.options.now() });
    return destroyed;
  }

  async listRemoteServers(): Promise<readonly IsolationRemoteServerSettings[]> {
    return this.remoteServerStore.list();
  }

  async upsertRemoteServer(input: IsolationRemoteServerInput): Promise<IsolationRemoteServerSettings> {
    const server = await this.remoteServerStore.upsert(input);
    await this.emit({
      type: 'isolation.remoteServers.changed',
      servers: await this.remoteServerStore.list(),
      at: this.options.now()
    });
    return server;
  }

  async deleteRemoteServer(serverId: string): Promise<boolean> {
    const deleted = await this.remoteServerStore.delete(serverId);
    if (deleted) {
      await this.emit({
        type: 'isolation.remoteServers.changed',
        servers: await this.remoteServerStore.list(),
        at: this.options.now()
      });
    }
    return deleted;
  }

  async listRunners(): Promise<readonly IsolationRunnerSummary[]> {
    const servers = await this.remoteServerStore.list();
    return [this.getDockerRunnerSummary(), ...servers.map((server) => this.getRemoteRunnerSummary(server))];
  }

  async getEvents(sessionId: string): Promise<readonly DaemonIsolationEvent[]> {
    const filePath = this.getEventsFile(sessionId);
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const content = await fs.promises.readFile(filePath, 'utf8');
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as DaemonIsolationEvent];
        } catch {
          return [];
        }
      });
  }

  async setStage(sessionId: string, stage: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (
      !session ||
      session.status === 'destroyed' ||
      session.status === 'failed' ||
      session.status === 'ready_for_review'
    ) {
      return;
    }

    await this.updateSession(sessionId, { stage });
  }

  private async provision(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    try {
      await this.updateSession(sessionId, { status: 'creating', error: undefined });
      await this.updateSession(sessionId, { status: 'preparing', stage: 'Resolving GitHub repository source.' });
      await this.log(sessionId, 'info', `Resolving clone source for ${session.branchName}.`);
      const cloneSource = await this.gitService.resolveCloneSource({
        branchName: session.branchName,
        baseRef: session.baseRef,
        continueExisting: session.attempt > 1
      });
      let currentSession = await this.updateSession(sessionId, {
        baseRef: cloneSource.baseRef,
        baseSha: cloneSource.baseSha,
        remoteName: cloneSource.remoteName,
        stage: 'GitHub clone source resolved.'
      });
      if (this.shouldAbortProvision(sessionId)) {
        return;
      }

      const runner = await this.resolveRunner(session);
      await this.log(sessionId, 'info', `Checking ${runner.label}.`);
      await runner.provider.healthcheck();
      if (this.shouldAbortProvision(sessionId)) {
        return;
      }
      await this.log(sessionId, 'info', `Starting isolated runner: ${runner.label}.`);
      const container = await runner.provider.start({ sessionId });
      if (this.shouldAbortProvision(sessionId)) {
        await runner.provider.destroy(container.containerName).catch(() => undefined);
        return;
      }
      const runnerWorkspacePath = container.workspacePath || '/workspace';
      currentSession = await this.updateSession(sessionId, {
        status: 'preparing',
        stage: `Cloning repository and installing AIST on ${runner.label}.`,
        provider: runner.kind,
        runnerId: runner.runnerId,
        runnerLabel: runner.label,
        containerId: container.containerId,
        containerName: container.containerName,
        worktreePath: runnerWorkspacePath,
        startedAt: this.options.now()
      });
      const containerWorkspace = await prepareContainerWorkspace({
        dockerProvider: runner.provider,
        containerName: container.containerName,
        workspacePath: runnerWorkspacePath,
        remoteUrl: cloneSource.remoteUrl,
        branchName: session.branchName,
        baseRef: currentSession.baseRef,
        continueExisting: session.attempt > 1
      });
      currentSession = await this.updateSession(sessionId, {
        status: 'running_agent',
        stage: `Agent is working on ${runner.label}.`,
        baseSha: containerWorkspace.baseSha || currentSession.baseSha,
        remoteName: containerWorkspace.remoteName,
        worktreePath: containerWorkspace.workspacePath
      });
      await this.log(sessionId, 'info', 'Runner workspace is ready. Starting isolated agent runtime.');
      const flow = await this.getFlow(currentSession.flow?.flowId);
      const runResult = flow
        ? await this.runFlowInIsolation({
            session: currentSession,
            flow,
            worktreePath: containerWorkspace.workspacePath,
            containerName: container.containerName,
            executionProvider: runner.provider
          })
        : await this.runSingleAgentStep({
            session: currentSession,
            worktreePath: containerWorkspace.workspacePath,
            containerName: container.containerName,
            executionProvider: runner.provider
          });
      if (this.shouldAbortProvision(sessionId)) {
        return;
      }
      currentSession = await this.updateSession(sessionId, {
        status: 'post_processing',
        stage: 'Finalizing git changes.',
        lastRunId: runResult.runId
      });
      await this.updateSession(sessionId, { status: 'committing', stage: `Creating commit and PR on ${runner.label}.` });
      const finalized = await finalizeContainerWorkspace({
        dockerProvider: runner.provider,
        containerName: container.containerName,
        branchName: currentSession.branchName,
        prompt: currentSession.prompt,
        fallbackAnswer: runResult.answer,
        sessionId,
        auxiliaryModel: this.options.auxiliaryModel,
        onStage: async (status, stage) => {
          await this.updateSession(sessionId, { status, stage });
          await this.log(sessionId, 'info', stage);
        }
      });
      await this.destroyContainer(currentSession);
      await this.log(
        sessionId,
        'info',
        finalized.changed
          ? `Created commit ${finalized.commitSha || 'unknown'}.`
          : 'Agent finished without file changes and fallback artifact could not be created.'
      );
      if (finalized.fallbackArtifactPath) {
        await this.log(sessionId, 'info', `Fallback review artifact created: ${finalized.fallbackArtifactPath}`);
      }
      if (finalized.pushed) {
        await this.log(sessionId, 'info', `Pushed branch ${currentSession.branchName}.`);
      }
      if (finalized.prUrl) {
        await this.log(sessionId, 'info', `Pull request is ready: ${finalized.prUrl}`);
      } else if (finalized.prError) {
        await this.log(sessionId, 'warn', `Pull request was not created: ${finalized.prError}`);
      } else if (!currentSession.remoteName) {
        await this.log(sessionId, 'warn', 'No git remote is configured, so PR creation was skipped.');
      }
      await this.updateSession(sessionId, {
        status: 'ready_for_review',
        stage: 'Ready for review.',
        containerId: undefined,
        containerName: undefined,
        worktreePath: undefined,
        commitSha: finalized.commitSha,
        headSha: finalized.headSha,
        prUrl: finalized.prUrl,
        finishedAt: this.options.now()
      });
    } catch (error) {
      this.stopHandlers.delete(sessionId);
      await this.log(sessionId, 'error', formatError(error));
      const failedSession = this.sessions.get(sessionId);
      if (failedSession?.status === 'destroyed' || failedSession?.status === 'stopping') {
        return;
      }
      if (failedSession) {
        await this.destroyContainer(failedSession);
      }
      await this.updateSession(sessionId, {
        status: 'failed',
        stage: 'Failed.',
        error: formatError(error),
        finishedAt: this.options.now()
      });
    }
  }

  private async runSingleAgentStep({
    session,
    worktreePath,
    containerName,
    executionProvider
  }: {
    session: IsolationSessionSummary;
    worktreePath: string;
    containerName: string;
    executionProvider: IsolationExecutionProvider;
  }): Promise<{ runId?: string; answer?: string }> {
    try {
      return await this.options.runAgent({
        session,
        runPrompt: session.prompt,
        worktreePath,
        containerName,
        dockerProvider: executionProvider,
        registerStopHandler: (handler) => this.stopHandlers.set(session.sessionId, handler)
      });
    } finally {
      this.stopHandlers.delete(session.sessionId);
    }
  }

  private async runFlowInIsolation({
    session,
    flow,
    worktreePath,
    containerName,
    executionProvider
  }: {
    session: IsolationSessionSummary;
    flow: AutonomousFlowDefinition;
    worktreePath: string;
    containerName: string;
    executionProvider: IsolationExecutionProvider;
  }): Promise<{ runId?: string; answer?: string }> {
    const autonomousSessionId = createSessionId('isolation-flow');
    const abortController = new AbortController();
    const activeStageStopHandler: { current?: () => void } = {};
    const sessionStore = new AutonomousSessionStore(this.options.workspaceRoot, {
      homeDir: this.options.homeDir,
      onEvent: (eventSessionId, event) => {
        if (eventSessionId !== autonomousSessionId) {
          return;
        }
        void this.handleAutonomousFlowEvent({ isolationSessionId: session.sessionId, autonomousSessionId, event });
      }
    });
    let lastRunId: string | undefined;
    let lastAnswer: string | undefined;

    await this.updateSession(session.sessionId, {
      flow: toFlowSelection({ flow, autonomousSessionId, status: 'running' }),
      stage: `Flow ${flow.title} is starting.`
    });
    await this.log(session.sessionId, 'info', `Using isolated agent flow ${flow.id} (${flow.stages.length} stages).`);

    this.stopHandlers.set(session.sessionId, () => {
      abortController.abort();
      activeStageStopHandler.current?.();
    });

    const engine = createIsolatedAgentAutonomousEngine({
      session,
      worktreePath,
      containerName,
      dockerProvider: executionProvider,
      registerStopHandler: (handler) => {
        activeStageStopHandler.current = handler;
      },
      runAgent: async (input) => {
        const latestSession = this.requireSession(session.sessionId);
        const result = await this.options.runAgent({ ...input, session: latestSession });
        lastRunId = result.runId || lastRunId;
        lastAnswer = result.answer || lastAnswer;
        if (result.runId && !this.shouldAbortProvision(session.sessionId)) {
          await this.updateSession(session.sessionId, { lastRunId: result.runId });
        }
        return result;
      }
    });

    try {
      const result = await runAutonomousFlow({
        flow,
        workspaceRoot: this.options.workspaceRoot,
        workDir: worktreePath,
        launch: {
          engineId: ISOLATED_AGENT_ENGINE_ID,
          dryRun: false,
          extraPrompt: session.prompt
        },
        sessionStore,
        engineRegistry: {
          list: () => [engine],
          get: (engineId) => {
            if (engineId !== ISOLATED_AGENT_ENGINE_ID) {
              throw new Error(`Unknown isolated autonomous engine: ${engineId}`);
            }
            return engine;
          }
        },
        signal: abortController.signal,
        sessionId: autonomousSessionId
      });
      await this.updateSession(session.sessionId, {
        flow: toFlowSelection({ flow, autonomousSessionId, state: result.state }),
        stage:
          result.state.status === 'finished'
            ? `Flow ${flow.title} finished.`
            : `Flow ${flow.title} finished with status ${result.state.status}.`
      });
      if (result.state.status !== 'finished') {
        throw new Error(`Isolated flow ${flow.id} finished with status ${result.state.status}.`);
      }
      return { runId: lastRunId, answer: lastAnswer };
    } finally {
      this.stopHandlers.delete(session.sessionId);
    }
  }

  private async handleAutonomousFlowEvent({
    isolationSessionId,
    autonomousSessionId,
    event
  }: {
    isolationSessionId: string;
    autonomousSessionId: string;
    event: AutonomousEvent;
  }): Promise<void> {
    const session = this.sessions.get(isolationSessionId);
    if (!session || this.shouldAbortProvision(isolationSessionId)) {
      return;
    }

    if (shouldMirrorAutonomousEvent(event)) {
      await this.log(
        isolationSessionId,
        autonomousEventLevelToIsolationLogLevel(event.level),
        `[flow] ${event.message}`
      );
    }
    await this.syncAutonomousFlowState({
      isolationSessionId,
      autonomousSessionId,
      stage: shouldExposeAutonomousEventAsIsolationStage(event) ? event.message : undefined
    });
  }

  private async syncAutonomousFlowState({
    isolationSessionId,
    autonomousSessionId,
    stage
  }: {
    isolationSessionId: string;
    autonomousSessionId: string;
    stage?: string;
  }): Promise<void> {
    const session = this.sessions.get(isolationSessionId);
    if (!session?.flow || session.flow.autonomousSessionId !== autonomousSessionId) {
      return;
    }

    try {
      const sessionStore = new AutonomousSessionStore(this.options.workspaceRoot, { homeDir: this.options.homeDir });
      const autonomousSession = await sessionStore.readSession(autonomousSessionId, 0);
      if (!autonomousSession.flow) {
        return;
      }
      if (this.shouldAbortProvision(isolationSessionId)) {
        return;
      }
      const patch: Partial<Omit<IsolationSessionSummary, 'sessionId' | 'createdAt'>> = {
        flow: toFlowSelection({
          flow: {
            id: session.flow.flowId,
            title: session.flow.title,
            stages:
              session.flow.stages?.map((flowStage) => ({
                index: flowStage.index,
                title: flowStage.title
              })) ?? []
          },
          autonomousSessionId,
          state: autonomousSession.flow
        })
      };
      await this.updateSession(isolationSessionId, stage ? { ...patch, stage } : patch);
    } catch {
      return;
    }
  }

  private async destroyContainer(session: IsolationSessionSummary): Promise<void> {
    const target = session.containerId || session.containerName;
    if (!target) {
      return;
    }

    try {
      const runner = await this.resolveRunner(session);
      await this.log(session.sessionId, 'info', `Destroying isolated runner ${target}.`);
      await runner.provider.destroy(target);
    } catch (error) {
      await this.log(session.sessionId, 'warn', formatError(error));
    }
  }

  private async resolveRunner(session: IsolationSessionSummary): Promise<ResolvedIsolationRunner> {
    if (session.provider !== 'remote-server') {
      return {
        kind: 'docker-local',
        runnerId: 'docker-local',
        label: 'Local Docker',
        provider: this.dockerProvider
      };
    }

    const serverId = session.runnerId;
    if (!serverId) {
      throw new Error('Remote runner is not selected.');
    }
    const server = (await this.remoteServerStore.list()).find((candidate) => candidate.id === serverId);
    if (!server) {
      throw new Error(`Remote server not found: ${serverId}`);
    }

    return {
      kind: 'remote-server',
      runnerId: server.id,
      label: server.name,
      provider: new RemoteSshIsolationProvider({ server, env: this.options.env })
    };
  }

  private getDockerRunnerSummary(): IsolationRunnerSummary {
    const activeSessionId = findActiveSessionForRunner({ sessions: this.sessions.values(), runnerId: 'docker-local' });
    return {
      id: 'docker-local',
      provider: 'docker-local',
      label: 'Local Docker',
      description: 'Run isolated agent in a local Docker container.',
      availability: activeSessionId ? 'busy' : 'unknown',
      activeSessionId
    };
  }

  private getRemoteRunnerSummary(server: IsolationRemoteServerSettings): IsolationRunnerSummary {
    const activeSessionId = findActiveSessionForRunner({ sessions: this.sessions.values(), runnerId: server.id });
    return {
      id: server.id,
      provider: 'remote-server',
      label: server.name,
      description: `${server.username}@${server.host}:${server.port}`,
      availability: activeSessionId ? 'busy' : 'unknown',
      activeSessionId,
      server
    };
  }

  private async updateSession(
    sessionId: string,
    patch: Partial<Omit<IsolationSessionSummary, 'sessionId' | 'createdAt'>>
  ): Promise<IsolationSessionSummary> {
    const existing = this.requireSession(sessionId);
    const updated: IsolationSessionSummary = {
      ...existing,
      ...patch,
      updatedAt: this.options.now()
    };
    await this.saveSession(updated);
    await this.emit({ type: 'isolation.session.status', session: updated, at: updated.updatedAt });
    return updated;
  }

  private async saveSession(session: IsolationSessionSummary): Promise<void> {
    this.sessions.set(session.sessionId, session);
    await writeJsonAtomic(this.sessionsFile, { sessions: this.list() });
  }

  private shouldAbortProvision(sessionId: string): boolean {
    const status = this.sessions.get(sessionId)?.status;
    return status === 'stopping' || status === 'destroyed';
  }

  async log(sessionId: string, level: 'info' | 'warn' | 'error', message: string): Promise<void> {
    await this.emit({
      type: 'isolation.session.log',
      sessionId,
      level,
      message,
      at: this.options.now()
    });
  }

  private async emit(event: DaemonIsolationEvent): Promise<void> {
    await safeMkdir(this.eventsDir);
    await appendJsonl(this.getEventsFile(getEventSessionId(event)), event);
    this.options.emit(event);
  }

  private getEventsFile(sessionId: string): string {
    return path.join(this.eventsDir, `${sanitizeFileName(sessionId)}.jsonl`);
  }

  private requireSession(sessionId: string): IsolationSessionSummary {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Isolation session not found: ${sessionId}`);
    }
    return session;
  }

  private load(): void {
    if (!fs.existsSync(this.sessionsFile)) {
      return;
    }

    try {
      const parsed = JSON.parse(fs.readFileSync(this.sessionsFile, 'utf8')) as {
        sessions?: IsolationSessionSummary[];
      };
      for (const session of parsed.sessions || []) {
        this.sessions.set(session.sessionId, recoverSessionStatus(session, this.options.now()));
      }
    } catch {
      this.sessions.clear();
    }
  }

  private async getFlow(flowId: string | undefined): Promise<AutonomousFlowDefinition | undefined> {
    const normalizedFlowId = flowId?.trim();
    if (!normalizedFlowId) {
      return undefined;
    }

    const definitions = await discoverAutonomousDefinitions({ workspaceRoot: this.options.workspaceRoot });
    const flow = definitions.flows.find((candidate) => candidate.id === normalizedFlowId);
    if (!flow) {
      throw new Error(`Isolation flow not found: ${normalizedFlowId}`);
    }
    return flow;
  }
}

type ResolvedIsolationRunner = {
  readonly kind: IsolationProviderKind;
  readonly runnerId?: string;
  readonly label: string;
  readonly provider: IsolationExecutionProvider;
};

function normalizeProvider(provider: IsolationProviderKind | undefined, runnerId?: string): IsolationProviderKind {
  if (provider) {
    return provider;
  }
  return runnerId?.trim() && runnerId !== 'docker-local' ? 'remote-server' : 'docker-local';
}

type FlowSelectionSource = {
  readonly id: string;
  readonly title: string;
  readonly stages: readonly { readonly index: number; readonly title: string }[];
};

function toInitialFlowSelection(flow: FlowSelectionSource): IsolationFlowSelection {
  return toFlowSelection({ flow });
}

function toFlowSelection({
  flow,
  autonomousSessionId,
  status,
  state
}: {
  flow: FlowSelectionSource;
  autonomousSessionId?: string;
  status?: AutonomousSessionStatus;
  state?: AutonomousFlowState;
}): IsolationFlowSelection {
  const stages = state
    ? state.stages.map((stage) => ({
        index: stage.index,
        title: stage.title,
        status: stage.status,
        model: stage.model,
        error: stage.error
      }))
    : flow.stages.map((stage) => ({
        index: stage.index,
        title: stage.title,
        status: 'pending' as const
      }));

  return {
    flowId: flow.id,
    title: flow.title,
    stageCount: flow.stages.length,
    autonomousSessionId,
    status: state?.status || status,
    currentStageIndex: state?.currentStageIndex,
    stages
  };
}

function shouldMirrorAutonomousEvent(event: AutonomousEvent): boolean {
  return event.action !== 'ASSISTANT' && event.action !== 'THINKING';
}

function shouldExposeAutonomousEventAsIsolationStage(event: AutonomousEvent): boolean {
  return (
    event.action === 'FLOW' ||
    event.action === 'STAGE' ||
    event.action === 'STAGE_CTX' ||
    event.action === 'DONE' ||
    event.action === 'ERROR' ||
    event.action === 'SYS'
  );
}

function autonomousEventLevelToIsolationLogLevel(level: AutonomousEvent['level']): 'info' | 'warn' | 'error' {
  if (level === 'error') {
    return 'error';
  }
  if (level === 'warning') {
    return 'warn';
  }
  return 'info';
}

function findActiveSessionForRunner({
  sessions,
  runnerId
}: {
  sessions: Iterable<IsolationSessionSummary>;
  runnerId: string;
}): string | undefined {
  for (const session of sessions) {
    const sessionRunnerId = session.runnerId || (session.provider === 'docker-local' ? 'docker-local' : undefined);
    if (sessionRunnerId === runnerId && isActiveIsolationSessionStatus(session.status)) {
      return session.sessionId;
    }
  }
  return undefined;
}

function isActiveIsolationSessionStatus(status: IsolationSessionStatus): boolean {
  return (
    status === 'queued' ||
    status === 'preparing' ||
    status === 'creating' ||
    status === 'running_agent' ||
    status === 'post_processing' ||
    status === 'committing' ||
    status === 'pushing' ||
    status === 'creating_pr' ||
    status === 'stopping'
  );
}

function recoverSessionStatus(session: IsolationSessionSummary, now: number): IsolationSessionSummary {
  if (
    session.status === 'preparing' ||
    session.status === 'creating' ||
    session.status === 'running_agent' ||
    session.status === 'post_processing' ||
    session.status === 'committing' ||
    session.status === 'pushing' ||
    session.status === 'creating_pr' ||
    (session.status as string) === 'running' ||
    session.status === 'stopping'
  ) {
    return {
      ...session,
      status: 'failed',
      error: 'Daemon restarted while this isolated session was active. Use Retry/Continue from UI.',
      updatedAt: now
    };
  }

  return session;
}

function getEventSessionId(event: DaemonIsolationEvent): string {
  if (event.type === 'isolation.session.log') {
    return event.sessionId;
  }
  if (event.type === 'isolation.remoteServers.changed') {
    return 'remote-servers';
  }
  return event.session.sessionId;
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.-]/g, '-');
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
