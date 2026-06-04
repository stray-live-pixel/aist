import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AutonomousSessionStore } from '../../../core/processes/autonomous';
import type { DaemonIsolationEvent, IsolationSessionStatus } from '../../daemonProtocol';
import { IsolationSessionManager } from './IsolationSessionManager';
import { LocalDockerIsolationProvider, type LocalDockerExecResult } from './LocalDockerIsolationProvider';
import { IsolationGitService } from './git/IsolationGitService';

const tempDirs: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('IsolationSessionManager', () => {
  it('runs the agent in a container-cloned repository without creating a host worktree', async () => {
    const workspaceRoot = createTempDir({ prefix: 'aist-isolation-workspace-' });
    const homeDir = createTempDir({ prefix: 'aist-isolation-home-' });
    const events: DaemonIsolationEvent[] = [];
    let now = 1000;

    const resolveCloneSource = vi.spyOn(IsolationGitService.prototype, 'resolveCloneSource').mockResolvedValue({
      repoRoot: workspaceRoot,
      remoteName: 'origin',
      remoteUrl: 'https://github.com/acme/project.git',
      baseRef: 'HEAD',
      baseSha: 'base-sha'
    });
    const removeWorktree = vi.spyOn(IsolationGitService.prototype, 'removeWorktree').mockResolvedValue(undefined);
    vi.spyOn(LocalDockerIsolationProvider.prototype, 'healthcheck').mockResolvedValue(undefined);
    const startContainer = vi.spyOn(LocalDockerIsolationProvider.prototype, 'start').mockResolvedValue({
      containerId: 'container-id',
      containerName: 'container-name'
    });
    const execContainer = vi.spyOn(LocalDockerIsolationProvider.prototype, 'exec').mockImplementation(async ({ script }) => {
      if (script.includes('git clone')) {
        return containerExecResult({ stdout: 'remote=https://github.com/acme/project.git\nbaseSha=container-base-sha\nbranch=aist/task/task-id-1234\n' });
      }
      return containerExecResult({ stdout: 'changed=true\ncommitSha=commit-sha\nheadSha=commit-sha\npushed=true\nprUrl=https://github.com/acme/project/pull/1\n' });
    });
    vi.spyOn(LocalDockerIsolationProvider.prototype, 'destroy').mockResolvedValue(undefined);

    const manager = new IsolationSessionManager({
      workspaceRoot,
      homeDir,
      env: {},
      now: () => now++,
      idFactory: createIdFactory({ ids: ['task-id-1234567890', 'session-id'] }),
      emit: (event) => events.push(event),
      createChat: vi.fn().mockResolvedValue(undefined),
      runAgent: vi.fn().mockResolvedValue({ runId: 'run-id', answer: 'done' })
    });

    const started = await manager.start({ prompt: 'Create a pull request.' });
    const session = await waitForSessionStatus({ manager, sessionId: started.sessionId, status: 'ready_for_review' });

    expect(resolveCloneSource).toHaveBeenCalledWith({
      branchName: started.branchName,
      baseRef: undefined,
      continueExisting: false
    });
    expect(startContainer).toHaveBeenCalledWith({ sessionId: started.sessionId });
    expect(execContainer).toHaveBeenCalledWith(expect.objectContaining({ container: 'container-name', cwd: '/' }));
    expect(execContainer).toHaveBeenCalledWith(expect.objectContaining({ container: 'container-name', cwd: '.' }));
    expect(removeWorktree).not.toHaveBeenCalled();
    expect(session.worktreePath).toBeUndefined();
    expect(session.containerId).toBeUndefined();
    expect(session.containerName).toBeUndefined();
    expect(session.commitSha).toBe('commit-sha');
    expect(session.prUrl).toBe('https://github.com/acme/project/pull/1');
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'isolation.session.log',
        sessionId: started.sessionId,
        message: 'Container workspace is ready. Starting isolated agent runtime.'
      })
    );
  });

  it('runs a selected autonomous flow through the isolated agent engine before finalizing git', async () => {
    const workspaceRoot = createTempDir({ prefix: 'aist-isolation-flow-workspace-' });
    const homeDir = createTempDir({ prefix: 'aist-isolation-flow-home-' });
    const worktreePath = '/workspace';
    const events: DaemonIsolationEvent[] = [];
    let now = 2000;
    writeFlowDefinition({ workspaceRoot });

    vi.spyOn(IsolationGitService.prototype, 'resolveCloneSource').mockResolvedValue({
      repoRoot: workspaceRoot,
      remoteName: 'origin',
      remoteUrl: 'https://github.com/acme/project.git',
      baseRef: 'HEAD',
      baseSha: 'base-sha'
    });
    vi.spyOn(IsolationGitService.prototype, 'removeWorktree').mockResolvedValue(undefined);
    vi.spyOn(LocalDockerIsolationProvider.prototype, 'healthcheck').mockResolvedValue(undefined);
    vi.spyOn(LocalDockerIsolationProvider.prototype, 'start').mockResolvedValue({
      containerId: 'container-id',
      containerName: 'container-name'
    });
    vi.spyOn(LocalDockerIsolationProvider.prototype, 'exec').mockImplementation(async ({ script }) => {
      if (script.includes('git clone')) {
        return containerExecResult({ stdout: 'remote=https://github.com/acme/project.git\nbaseSha=container-base-sha\nbranch=aist/task/task-id-1234\n' });
      }
      return containerExecResult({ stdout: 'changed=true\ncommitSha=flow-commit-sha\nheadSha=flow-commit-sha\npushed=true\nprUrl=https://github.com/acme/project/pull/2\n' });
    });
    vi.spyOn(LocalDockerIsolationProvider.prototype, 'destroy').mockResolvedValue(undefined);

    const runAgent = vi.fn(async (input) => ({
      runId: `run-${input.stageIndex}`,
      answer: `stage-${input.stageIndex}-answer`
    }));
    const manager = new IsolationSessionManager({
      workspaceRoot,
      homeDir,
      env: {},
      now: () => now++,
      idFactory: createIdFactory({ ids: ['task-id-1234567890', 'session-id'] }),
      emit: (event) => events.push(event),
      createChat: vi.fn().mockResolvedValue(undefined),
      runAgent
    });

    const started = await manager.start({ prompt: 'Ship the isolated workflow.', flowId: 'review-ready' });
    const session = await waitForSessionStatus({ manager, sessionId: started.sessionId, status: 'ready_for_review' });
    const firstStage = runAgent.mock.calls[0]?.[0];
    const secondStage = runAgent.mock.calls[1]?.[0];

    expect(runAgent).toHaveBeenCalledTimes(2);
    expect(firstStage).toMatchObject({
      stageIndex: 1,
      model: 'default-stage-model',
      worktreePath,
      containerName: 'container-name'
    });
    expect(firstStage?.runPrompt).toContain('# Extra prompt');
    expect(firstStage?.runPrompt).toContain('Ship the isolated workflow.');
    expect(firstStage?.runPrompt).toContain('Plan the implementation.');
    expect(firstStage?.runPrompt).not.toContain('Build the implementation.');
    expect(secondStage).toMatchObject({
      stageIndex: 2,
      model: 'stage-two-model',
      worktreePath,
      containerName: 'container-name'
    });
    expect(secondStage?.runPrompt).toContain('## Previous stage context from stage 1');
    expect(secondStage?.runPrompt).toContain('stage-1-answer');
    expect(secondStage?.runPrompt).toContain('Build the implementation.');
    expect(session).toMatchObject({ commitSha: 'flow-commit-sha', headSha: 'flow-commit-sha' });
    expect(session.flow).toMatchObject({
      flowId: 'review-ready',
      title: 'Review Ready',
      stageCount: 2,
      status: 'finished'
    });
    expect(session.flow?.stages?.map((stage) => stage.status)).toEqual(['done', 'done']);
    expect(session.lastRunId).toBe('run-2');
    expect(session.prUrl).toBe('https://github.com/acme/project/pull/2');
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'isolation.session.log',
        sessionId: started.sessionId,
        message: '[flow] Stage 1: Plan started.'
      })
    );

    const autonomousSessionId = session.flow?.autonomousSessionId;
    expect(autonomousSessionId).toBeTruthy();
    const autonomousSession = await new AutonomousSessionStore(workspaceRoot, { homeDir }).readSession(
      autonomousSessionId!
    );
    expect(autonomousSession.meta.engineId).toBe('aist-isolated-agent');
    expect(autonomousSession.flow?.stages.map((stage) => stage.status)).toEqual(['done', 'done']);
  });
});

/**
 * Что это: создаёт временную папку для isolated-теста.
 * Зачем нужно: тест не должен писать в настоящий workspace или домашнюю директорию пользователя.
 * Какую продуктовую проблему решает: проверка cleanup остаётся безопасной и воспроизводимой локально.
 */
function createTempDir({ prefix }: { prefix: string }): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(tempDir);
  return tempDir;
}

/**
 * Что это: отдаёт предсказуемые ID для manager lifecycle.
 * Зачем нужно: ветка и sessionId должны быть стабильными, чтобы regression-тест проверял конкретный сценарий.
 * Какую продуктовую проблему решает: тест ловит регресс cleanup без случайных значений в ожидаемых данных.
 */
function createIdFactory({ ids }: { ids: string[] }): () => string {
  const queue = [...ids];
  return () => queue.shift() || 'fallback-id';
}

/**
 * Что это: создаёт результат docker exec для тестов без реального Docker.
 * Зачем нужно: lifecycle isolated sessions проверяется как чистая бизнес-логика.
 * Какую продуктовую проблему решает: регресс автономного container-only сценария ловится быстро и детерминированно.
 */
function containerExecResult({
  stdout = '',
  stderr = '',
  ok = true
}: {
  stdout?: string;
  stderr?: string;
  ok?: boolean;
}): LocalDockerExecResult {
  return {
    ok,
    exitCode: ok ? 0 : 1,
    signal: null,
    stdout,
    stderr,
    timedOut: false,
    durationMs: 1
  };
}

function writeFlowDefinition({ workspaceRoot }: { workspaceRoot: string }): void {
  const flowRoot = path.join(workspaceRoot, '.aist-agent', 'autonomous', 'flows', 'review-ready');
  fs.mkdirSync(flowRoot, { recursive: true });
  fs.writeFileSync(
    path.join(flowRoot, '.index.md'),
    [
      '---',
      'title: Review Ready',
      'description: Two stage isolated test flow.',
      'model: default-stage-model',
      'stages:',
      '  - 1-plan.md',
      '  - 2-build.md',
      '---',
      '',
      '# Review Ready'
    ].join('\n'),
    'utf8'
  );
  fs.writeFileSync(
    path.join(flowRoot, '1-plan.md'),
    ['---', 'title: Plan', '---', '', 'Plan the implementation.'].join('\n'),
    'utf8'
  );
  fs.writeFileSync(
    path.join(flowRoot, '2-build.md'),
    [
      '---',
      'title: Build',
      'model: stage-two-model',
      'contexts:',
      '  - mode: continue',
      '    from: 1',
      '---',
      '',
      'Build the implementation.'
    ].join('\n'),
    'utf8'
  );
}

/**
 * Что это: ждёт, пока фоновый isolated lifecycle дойдёт до нужного статуса.
 * Зачем нужно: start возвращается сразу, а provision выполняется асинхронно после ответа RPC.
 * Какую продуктовую проблему решает: тест проверяет финальное состояние сессии, а не промежуточный queued/preparing статус.
 */
async function waitForSessionStatus({
  manager,
  sessionId,
  status
}: {
  manager: IsolationSessionManager;
  sessionId: string;
  status: IsolationSessionStatus;
}) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const session = manager.get(sessionId);
    if (session?.status === status) {
      return session;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error(`Timed out waiting for isolated session ${sessionId} status ${status}.`);
}
