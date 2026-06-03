import { IsolationGitService } from '../git/IsolationGitService';

/**
 * Что это: зависимости tool-adapter для isolated checkpoint commit.
 * Зачем нужно: runner получает git-сервис и session id без доступа к daemon manager.
 * Какую продуктовую проблему решает: commit создаётся строго внутри isolated worktree и не трогает пользовательский workspace.
 */
export type RunCreateIsolationCommitToolInput = {
  readonly gitService: IsolationGitService;
  readonly worktreePath: string;
  readonly sessionId: string;
  readonly args: Record<string, unknown>;
};

/**
 * Что это: выполняет create_isolation_commit.
 * Зачем нужно: модель завершает каждую подзадачу отдельным checkpoint-коммитом прямо в процессе run.
 * Какую продуктовую проблему решает: большая задача превращается в последовательность понятных review steps с собственными commit sha.
 */
export async function runCreateIsolationCommitTool({
  gitService,
  worktreePath,
  sessionId,
  args
}: RunCreateIsolationCommitToolInput): Promise<Record<string, unknown>> {
  const title = normalizeText({ value: args.title, fallback: 'AIST isolated subtask' });
  const summary = normalizeText({ value: args.summary, fallback: 'Completed isolated subtask.' });
  const result = await gitService.commitCheckpoint({ worktreePath, title, summary, sessionId });

  return {
    ok: true,
    changed: result.changed,
    commitSha: result.commitSha,
    headSha: result.headSha,
    title,
    summary,
    message: result.changed
      ? `Created isolated subtask commit ${result.commitSha}.`
      : 'No file changes to commit for this subtask.'
  };
}

/**
 * Что это: нормализует текстовые аргументы модели.
 * Зачем нужно: commit message всегда остаётся читаемым даже при неполном tool-call.
 * Какую продуктовую проблему решает: история подзадач не ломается из-за пустого title/summary.
 */
function normalizeText({ value, fallback }: { value: unknown; fallback: string }): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
