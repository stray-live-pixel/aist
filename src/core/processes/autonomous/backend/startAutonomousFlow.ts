import path from 'node:path';

import { discoverAutonomousDefinitions } from '../discovery';
import { createSessionId, runAutonomousFlow } from '../flow/orchestrator';
import type { AutonomousLaunchOptions } from '../types';
import { prepareAutonomousVcsIsolation } from '../vcsIsolation';
import type { AutonomousBackendContext } from './AutonomousBackendContext';
import type { AutonomousStartResult } from './AutonomousStartResult';
import { emitAutonomousFinished } from './emitAutonomousFinished';
import { emitAutonomousStarted } from './emitAutonomousStarted';

/**
 * Что это: запускает autonomous flow в отдельной session.
 * Зачем нужно: backend должен создать sessionId, AbortController, VCS-isolation и completion promise.
 * Какую продуктовую проблему решает: пользователь получает управляемый автономный запуск flow с событиями start/finish.
 */
export async function startAutonomousFlow({
  context,
  flowId,
  launch
}: {
  context: AutonomousBackendContext;
  flowId: string;
  launch: AutonomousLaunchOptions;
}): Promise<AutonomousStartResult> {
  const definitions = await discoverAutonomousDefinitions({ workspaceRoot: context.workspaceRoot });
  const flow = definitions.flows.find((candidate) => candidate.id === flowId);
  if (!flow) {
    throw new Error(`Unknown autonomous flow: ${flowId}`);
  }

  const sessionId = createSessionId('flow');
  const abortController = new AbortController();
  context.runningSessions.set(sessionId, abortController);
  const completion = prepareAutonomousVcsIsolation({
    workspaceRoot: context.workspaceRoot,
    sessionId,
    targetId: flow.id,
    isolation: launch.vcsIsolation
  })
    .then(async (vcs) => {
      const workspaceRoot = vcs.worktreeRoot || context.workspaceRoot;
      const workDir = launch.workDir ? path.resolve(workspaceRoot, launch.workDir) : workspaceRoot;
      try {
        await runAutonomousFlow({
          flow,
          workspaceRoot,
          workDir,
          launch,
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
  emitAutonomousStarted({ context, sessionId, kind: 'flow', targetId: flowId });
  return { operationId: context.idFactory(), accepted: true, sessionId, kind: 'flow', targetId: flowId };
}

/**
 * Что это: сохраняет promise завершения и удаляет его после settle.
 * Зачем нужно: waitForSession должен ждать живой запуск, но не держать завершённые promises в памяти.
 * Какую продуктовую проблему решает: daemon может обслуживать долгоживущий workspace без накопления старых сессий.
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
