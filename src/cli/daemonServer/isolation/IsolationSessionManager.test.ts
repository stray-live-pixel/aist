import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DaemonIsolationEvent, IsolationSessionStatus } from '../../daemonProtocol';
import { IsolationSessionManager } from './IsolationSessionManager';
import { LocalDockerIsolationProvider } from './LocalDockerIsolationProvider';
import { IsolationGitService } from './git/IsolationGitService';

const tempDirs: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('IsolationSessionManager', () => {
  it('removes the isolated worktree after creating the pull request', async () => {
    const workspaceRoot = createTempDir({ prefix: 'aist-isolation-workspace-' });
    const homeDir = createTempDir({ prefix: 'aist-isolation-home-' });
    const worktreePath = path.join(homeDir, 'prepared-worktree');
    const events: DaemonIsolationEvent[] = [];
    let now = 1000;

    const prepareWorktree = vi.spyOn(IsolationGitService.prototype, 'prepareWorktree').mockResolvedValue({
      repoRoot: workspaceRoot,
      worktreePath,
      branchName: 'aist/task/task-id',
      baseRef: 'HEAD',
      baseSha: 'base-sha',
      remoteName: 'origin'
    });
    const finalize = vi.spyOn(IsolationGitService.prototype, 'finalize').mockResolvedValue({
      changed: true,
      commitSha: 'commit-sha',
      headSha: 'commit-sha',
      pushed: true,
      prUrl: 'https://github.com/acme/project/pull/1'
    });
    const removeWorktree = vi.spyOn(IsolationGitService.prototype, 'removeWorktree').mockResolvedValue(undefined);
    vi.spyOn(LocalDockerIsolationProvider.prototype, 'healthcheck').mockResolvedValue(undefined);
    vi.spyOn(LocalDockerIsolationProvider.prototype, 'start').mockResolvedValue({
      containerId: 'container-id',
      containerName: 'container-name'
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

    expect(prepareWorktree).toHaveBeenCalledWith({
      sessionId: started.sessionId,
      branchName: started.branchName,
      baseRef: undefined,
      continueExisting: false
    });
    expect(finalize).toHaveBeenCalledWith(expect.objectContaining({ worktreePath, remoteName: 'origin' }));
    expect(removeWorktree).toHaveBeenCalledWith(worktreePath);
    expect(session.worktreePath).toBeUndefined();
    expect(session.containerId).toBeUndefined();
    expect(session.containerName).toBeUndefined();
    expect(session.commitSha).toBe('commit-sha');
    expect(session.prUrl).toBe('https://github.com/acme/project/pull/1');
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'isolation.session.log',
        sessionId: started.sessionId,
        message: `Removing finalized isolated worktree ${worktreePath}.`
      })
    );
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
