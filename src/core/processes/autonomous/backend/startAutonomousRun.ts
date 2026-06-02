import { runAutonomousBatch } from '../batch/runBatch';
import { discoverAutonomousDefinitions } from '../discovery';
import { createSessionId } from '../flow/orchestrator';
import type { AutonomousLaunchOptions } from '../types';
import { prepareAutonomousVcsIsolation } from '../vcsIsolation';
import type { AutonomousBackendContext } from './AutonomousBackendContext';
import type { AutonomousStartResult } from './AutonomousStartResult';
import { emitAutonomousFinished } from './emitAutonomousFinished';
import { emitAutonomousStarted } from './emitAutonomousStarted';

/**
 * Что это: запускает autonomous run/batch в отдельной session.
 * Зачем нужно: run выбирает definition, готовит VCS-isolation и запускает batch executor.
 * Какую продуктовую проблему решает: пользователь может запускать заранее описанные батчи задач с контролем stop/wait/export.
 */
export async function startAutonomousRun({
  context,
  runId,
  launch
}: {
  context: AutonomousBackendContext;
  runId: string;
  launch: AutonomousLaunchOptions;
}): Promise<AutonomousStartResult> {
  const definitions = await discoverAutonomousDefinitions({ workspaceRoot: context.workspaceRoot });
  const run = definitions.runs.find((candidate) => candidate.id === runId);
  if (!run) {
    throw new Error(`Unknown autonomous run: ${runId}`);
  }

  const sessionId = createSessionId('run');
  const abortController = new AbortController();
  context.runningSessions.set(sessionId, abortController);
  const completion = prepareAutonomousVcsIsolation({
    workspaceRoot: context.workspaceRoot,
    sessionId,
    targetId: run.id,
    isolation: launch.vcsIsolation
  })
    .then(async (vcs) => {
      const workspaceRoot = vcs.worktreeRoot || context.workspaceRoot;
      const workDir = launch.workDir || run.workDir || workspaceRoot;
      try {
        await runAutonomousBatch({
          run,
          definitions,
          workspaceRoot,
          launch: { ...launch, workDir },
          vcs: vcs.environment,
          sessionStore: context.sessionStore,
          engineRegistry: context.createEngineRegistry(),
          signal: abortController.signal,
          sessionId
        });
      } finally {
        await vcs.dispose();
      }
    })
    .then(() => context.sessionStore.readSession(sessionId))
    .finally(() => {
      context.runningSessions.delete(sessionId);
      return emitAutonomousFinished({ context, sessionId });
    });

  registerCompletion({ context, sessionId, completion });
  emitAutonomousStarted({ context, sessionId, kind: 'run', targetId: runId });
  return { operationId: context.idFactory(), accepted: true, sessionId, kind: 'run', targetId: runId };
}

/**
 * Что это: регистрирует promise завершения run-сессии.
 * Зачем нужно: waitForSession ждёт активный batch, а завершённые сессии не остаются в памяти.
 * Какую продуктовую проблему решает: долгоживущий daemon не копит завершённые автономные операции.
 */
function registerCompletion({
  context,
  sessionId,
  completion
}: {
  context: AutonomousBackendContext;
  sessionId: string;
  completion: ReturnType<AutonomousBackendContext['sessionStore']['readSession']>;
}): void {
  context.completions.set(sessionId, completion);
  completion.then(
    () => context.completions.delete(sessionId),
    () => context.completions.delete(sessionId)
  );
}
