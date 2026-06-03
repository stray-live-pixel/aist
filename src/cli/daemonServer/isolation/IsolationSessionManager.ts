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
import { IsolationGitService } from './git/IsolationGitService';

export type IsolationAgentRunInput = {
  /** Снимок сессии с chatId стандартного чата для live-наблюдения. */
  readonly session: IsolationSessionSummary;
  readonly worktreePath: string;
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
  private readonly gitService: IsolationGitService;
  private readonly sessionsFile: string;
  private readonly eventsDir: string;
  private readonly worktreesRoot: string;
  private readonly stopHandlers = new Map<string, () => void>();
  private sessions = new Map<string, IsolationSessionSummary>();

  constructor(private readonly options: IsolationSessionManagerOptions) {
    const root = path.join(globalWorkspaceRoot(options.workspaceRoot, options.homeDir), 'isolation');
    this.sessionsFile = path.join(root, 'sessions.json');
    this.eventsDir = path.join(root, 'events');
    this.worktreesRoot = path.join(root, 'worktrees');
    this.dockerProvider = new LocalDockerIsolationProvider({ env: options.env });
    this.gitService = new IsolationGitService({
      workspaceRoot: options.workspaceRoot,
      worktreesRoot: this.worktreesRoot,
      env: options.env
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
    if (session.worktreePath) {
      await this.log(sessionId, 'info', `Removing isolated worktree ${session.worktreePath}.`);
      await this.gitService.removeWorktree(session.worktreePath);
    }
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
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    try {
      await this.updateSession(sessionId, { status: 'creating', error: undefined });
      await this.updateSession(sessionId, { status: 'preparing', stage: 'Preparing isolated git worktree.' });
      await this.log(sessionId, 'info', `Preparing isolated worktree for ${session.branchName}.`);
      const worktree = await this.gitService.prepareWorktree({
        sessionId,
        branchName: session.branchName,
        baseRef: session.baseRef,
        continueExisting: session.attempt > 1
      });
      let currentSession = await this.updateSession(sessionId, {
        worktreePath: worktree.worktreePath,
        baseRef: worktree.baseRef,
        baseSha: worktree.baseSha,
        remoteName: worktree.remoteName,
        stage: 'Worktree ready.'
      });
      if (this.shouldAbortProvision(sessionId)) {
        return;
      }

      await this.log(sessionId, 'info', 'Checking local Docker daemon.');
      await this.dockerProvider.healthcheck();
      if (this.shouldAbortProvision(sessionId)) {
        return;
      }
      await this.log(sessionId, 'info', 'Starting isolated Docker container.');
      const container = await this.dockerProvider.start({
        sessionId,
        worktreePath: worktree.worktreePath
      });
      if (this.shouldAbortProvision(sessionId)) {
        await this.dockerProvider.destroy(container.containerName).catch(() => undefined);
        return;
      }
      currentSession = await this.updateSession(sessionId, {
        status: 'running_agent',
        stage: 'Agent is working in isolated environment.',
        containerId: container.containerId,
        containerName: container.containerName,
        startedAt: this.options.now()
      });
      await this.log(sessionId, 'info', 'Container is running. Starting isolated agent runtime.');
      const runResult = await this.options.runAgent({
        session: currentSession,
        worktreePath: worktree.worktreePath,
        containerName: container.containerName,
        dockerProvider: this.dockerProvider,
        registerStopHandler: (handler) => this.stopHandlers.set(sessionId, handler)
      });
      this.stopHandlers.delete(sessionId);
      if (this.shouldAbortProvision(sessionId)) {
        return;
      }
      currentSession = await this.updateSession(sessionId, {
        status: 'post_processing',
        stage: 'Finalizing git changes.',
        lastRunId: runResult.runId
      });
      await this.destroyContainer(currentSession);
      await this.updateSession(sessionId, { status: 'committing', stage: 'Creating commit and PR.' });
      const finalized = await this.gitService.finalize({
        worktreePath: worktree.worktreePath,
        branchName: currentSession.branchName,
        remoteName: currentSession.remoteName,
        prompt: currentSession.prompt,
        fallbackAnswer: runResult.answer,
        sessionId,
        onStage: async (status, stage) => {
          await this.updateSession(sessionId, { status, stage });
          await this.log(sessionId, 'info', stage);
        }
      });
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
