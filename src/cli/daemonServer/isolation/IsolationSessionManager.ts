import fs from 'node:fs';
import path from 'node:path';

import { appendJsonl, globalWorkspaceRoot, safeMkdir, writeJsonAtomic } from '../../../core/entities/storage/storage';
import type {
  DaemonIsolationEvent,
  DaemonIsolationStartParams,
  IsolationProviderKind,
  IsolationSessionSummary
} from '../../daemonProtocol';
import { LocalDockerIsolationProvider } from './LocalDockerIsolationProvider';
import { finalizeContainerRepository } from './git/finalizeContainerRepository';
import { getIsolationBaseSha } from './git/getIsolationBaseSha';
import { getIsolationRemoteName } from './git/getIsolationRemoteName';
import { getIsolationRepositoryUrl } from './git/getIsolationRepositoryUrl';

export type IsolationAgentRunInput = {
  /** Снимок сессии с chatId стандартного чата для live-наблюдения. */
  readonly session: IsolationSessionSummary;
  readonly repositoryUrl: string;
  readonly containerName: string;
  readonly dockerProvider: LocalDockerIsolationProvider;
  readonly registerStopHandler?: (handler: () => void) => void;
};

type IsolationSessionManagerOptions = {
  readonly workspaceRoot: string;
  readonly homeDir: string;
  readonly env: Record<string, string | undefined>;
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
  private readonly sessionsFile: string;
  private readonly eventsDir: string;
  private readonly stopHandlers = new Map<string, () => void>();
  private sessions = new Map<string, IsolationSessionSummary>();

  constructor(private readonly options: IsolationSessionManagerOptions) {
    const root = path.join(globalWorkspaceRoot(options.workspaceRoot, options.homeDir), 'isolation');
    this.sessionsFile = path.join(root, 'sessions.json');
    this.eventsDir = path.join(root, 'events');
    this.dockerProvider = new LocalDockerIsolationProvider({ env: options.env });
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
      branchName: `aist/task/${taskId.slice(0, 12)}`,
      baseRef: params.baseRef?.trim() || undefined,
      provider: normalizeProvider(params.provider),
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

  async continue(sessionId: string, prompt: string): Promise<IsolationSessionSummary> {
    const existing = this.requireSession(sessionId);
    const nextPrompt = prompt.trim();
    if (!nextPrompt) {
      throw new Error('Isolation continue prompt must not be empty.');
    }

    const chatId = existing.chatId || `isolation-${existing.sessionId}`;
    if (!existing.chatId) {
      await this.options.createChat({ chatId, prompt: nextPrompt });
    }

    const session = await this.updateSession(existing.sessionId, {
      chatId,
      prompt: nextPrompt,
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
    try {
      const session = await this.prepareContainerSession(sessionId);
      const container = await this.startContainerSession(session);
      const currentSession = await this.markAgentRunning({ sessionId, container });
      const runResult = await this.options.runAgent({
        session: currentSession,
        repositoryUrl: await this.getRepositoryUrl(currentSession),
        containerName: container.containerName,
        dockerProvider: this.dockerProvider,
        registerStopHandler: (handler) => this.stopHandlers.set(sessionId, handler)
      });
      this.stopHandlers.delete(sessionId);
      if (this.shouldAbortProvision(sessionId)) {
        return;
      }
      await this.finalizeContainerSession({ sessionId, runResult });
    } catch (error) {
      await this.failSession({ sessionId, error });
    }
  }

  /**
   * Что это: собирает git metadata и проверяет Docker перед запуском автономного контейнера.
   * Зачем нужно: локальный host теперь только сообщает repo URL/base metadata, а не готовит worktree.
   * Какую продуктовую проблему решает: запуск отделён от файловой системы компьютера пользователя.
   */
  private async prepareContainerSession(sessionId: string): Promise<IsolationSessionSummary> {
    const session = this.requireSession(sessionId);
    await this.updateSession(sessionId, { status: 'creating', error: undefined });
    await this.updateSession(sessionId, { status: 'preparing', stage: 'Resolving GitHub repository for autonomous container.' });
    await this.log(sessionId, 'info', `Preparing autonomous Docker clone for ${session.branchName}.`);
    const remoteName = await getIsolationRemoteName({ workspaceRoot: this.options.workspaceRoot, env: this.options.env });
    if (!remoteName) {
      throw new Error('Git remote is required for autonomous isolated containers. Add origin remote and retry.');
    }
    const baseRef = session.baseRef || 'HEAD';
    const baseSha = await getIsolationBaseSha({
      workspaceRoot: this.options.workspaceRoot,
      baseRef,
      env: this.options.env
    });
    const prepared = await this.updateSession(sessionId, {
      baseRef,
      baseSha,
      remoteName,
      stage: 'Repository metadata resolved.'
    });
    await this.log(sessionId, 'info', 'Checking local Docker daemon.');
    await this.dockerProvider.healthcheck();
    return prepared;
  }

  /**
   * Что это: стартует контейнер, который сам клонирует repo и создаёт ветку.
   * Зачем нужно: host не передаёт worktree через mount и не устанавливает зависимости за контейнер.
   * Какую продуктовую проблему решает: тот же provider можно заменить на удалённый Docker/server runner.
   */
  private async startContainerSession(session: IsolationSessionSummary) {
    if (this.shouldAbortProvision(session.sessionId)) {
      throw new Error('Isolation session was stopped before container start.');
    }
    const repositoryUrl = await this.getRepositoryUrl(session);
    await this.log(session.sessionId, 'info', `Starting autonomous Docker container from ${repositoryUrl}.`);
    return this.dockerProvider.start({
      sessionId: session.sessionId,
      repositoryUrl,
      branchName: session.branchName,
      baseRef: session.baseRef === 'HEAD' ? undefined : session.baseRef,
      env: await this.getContainerEnv()
    });
  }

  private async markAgentRunning({
    sessionId,
    container
  }: {
    sessionId: string;
    container: { readonly containerId: string; readonly containerName: string };
  }): Promise<IsolationSessionSummary> {
    if (this.shouldAbortProvision(sessionId)) {
      await this.dockerProvider.destroy(container.containerName).catch(() => undefined);
      throw new Error('Isolation session was stopped after container start.');
    }
    const currentSession = await this.updateSession(sessionId, {
      status: 'running_agent',
      stage: 'Agent is working in autonomous Docker container.',
      containerId: container.containerId,
      containerName: container.containerName,
      startedAt: this.options.now()
    });
    await this.log(sessionId, 'info', 'Container is ready. Starting isolated agent CLI inside container.');
    return currentSession;
  }

  private async finalizeContainerSession({
    sessionId,
    runResult
  }: {
    sessionId: string;
    runResult: { runId?: string; answer?: string };
  }): Promise<void> {
    const currentSession = await this.updateSession(sessionId, {
      status: 'post_processing',
      stage: 'Finalizing git changes inside container.',
      lastRunId: runResult.runId
    });
    if (!currentSession.containerName) {
      throw new Error('Container name is missing before isolation finalization.');
    }
    await this.updateSession(sessionId, { status: 'committing', stage: 'Creating commit and PR.' });
    const finalized = await finalizeContainerRepository({
      dockerProvider: this.dockerProvider,
      containerName: currentSession.containerName,
      branchName: currentSession.branchName,
      prompt: currentSession.prompt,
      fallbackAnswer: runResult.answer,
      sessionId,
      onStage: async (status, stage) => {
        await this.updateSession(sessionId, { status, stage });
        await this.log(sessionId, 'info', stage);
      }
    });
    await this.logFinalizationResult({ session: currentSession, finalized });
    await this.destroyContainer(currentSession);
    await this.updateSession(sessionId, {
      status: 'ready_for_review',
      stage: 'Ready for review.',
      containerId: undefined,
      containerName: undefined,
      commitSha: finalized.commitSha,
      headSha: finalized.headSha,
      prUrl: finalized.prUrl,
      finishedAt: this.options.now()
    });
  }

  private async logFinalizationResult({
    session,
    finalized
  }: {
    session: IsolationSessionSummary;
    finalized: Awaited<ReturnType<typeof finalizeContainerRepository>>;
  }): Promise<void> {
    await this.log(
      session.sessionId,
      'info',
      finalized.changed
        ? `Created commit ${finalized.commitSha || 'unknown'}.`
        : 'Agent finished without file changes and fallback artifact could not be created.'
    );
    if (finalized.fallbackArtifactPath) {
      await this.log(session.sessionId, 'info', `Fallback review artifact created: ${finalized.fallbackArtifactPath}`);
    }
    if (finalized.pushed) {
      await this.log(session.sessionId, 'info', `Pushed branch ${session.branchName}.`);
    }
    if (finalized.prUrl) {
      await this.log(session.sessionId, 'info', `Pull request is ready: ${finalized.prUrl}`);
    } else if (finalized.prError) {
      await this.log(session.sessionId, 'warn', `Pull request was not created: ${finalized.prError}`);
    }
  }

  private async failSession({ sessionId, error }: { sessionId: string; error: unknown }): Promise<void> {
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

  private async getRepositoryUrl(session: IsolationSessionSummary): Promise<string> {
    const remoteName = session.remoteName || (await getIsolationRemoteName({ workspaceRoot: this.options.workspaceRoot, env: this.options.env }));
    if (!remoteName) {
      throw new Error('Git remote is required for autonomous isolated containers.');
    }
    return getIsolationRepositoryUrl({ workspaceRoot: this.options.workspaceRoot, remoteName, env: this.options.env });
  }

  private async getContainerEnv(): Promise<Record<string, string | undefined>> {
    return {
      OPENROUTER_API_KEY: this.options.env.OPENROUTER_API_KEY,
      GH_TOKEN: this.options.env.GH_TOKEN || this.options.env.GITHUB_TOKEN,
      GITHUB_TOKEN: this.options.env.GITHUB_TOKEN || this.options.env.GH_TOKEN
    };
  }

  private async destroyContainer(session: IsolationSessionSummary): Promise<void> {
    const target = session.containerId || session.containerName;
    if (!target) {
      return;
    }

    try {
      await this.log(session.sessionId, 'info', `Destroying container ${target}.`);
      await this.dockerProvider.destroy(target);
    } catch (error) {
      await this.log(session.sessionId, 'warn', formatError(error));
    }
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
}

function normalizeProvider(provider: IsolationProviderKind | undefined): IsolationProviderKind {
  return provider || 'docker-local';
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
  return event.type === 'isolation.session.log' ? event.sessionId : event.session.sessionId;
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.-]/g, '-');
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
