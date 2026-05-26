import fs from 'node:fs/promises';
import path from 'node:path';

import type { AutonomousEngineRegistry } from '../engines/types';
import { runAutonomousFlow } from '../flow/orchestrator';
import { AutonomousSessionStore, createAutonomousEvent } from '../storage/sessionStore';
import type {
  AutonomousBatchState,
  AutonomousBatchTaskState,
  AutonomousDefinitions,
  AutonomousLaunchOptions,
  AutonomousRunDefinition,
  AutonomousSessionMeta
} from '../types';

export type RunBatchOptions = {
  run: AutonomousRunDefinition;
  definitions: AutonomousDefinitions;
  workspaceRoot: string;
  launch: AutonomousLaunchOptions;
  sessionStore: AutonomousSessionStore;
  engineRegistry: AutonomousEngineRegistry;
  signal: AbortSignal;
  sessionId?: string;
};

export type RunBatchResult = {
  sessionId: string;
  state: AutonomousBatchState;
};

/**
 * Исполняет run package как последовательность child flow sessions. Файлы задач
 * двигаются из `issues/` в `done/` только после финального успешного outer repeat:
 * это повторяет legacy-инвариант и защищает от потери незавершённых задач.
 */
export async function runAutonomousBatch(options: RunBatchOptions): Promise<RunBatchResult> {
  const sessionId = options.sessionId || `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const engineId = options.launch.dryRun ? 'dry-run' : options.launch.engineId;
  const meta: AutonomousSessionMeta = {
    id: sessionId,
    kind: 'run',
    targetId: options.run.id,
    status: 'running',
    engineId,
    workspaceRoot: options.workspaceRoot,
    workDir: options.launch.workDir || options.run.workDir,
    startedAt: new Date().toISOString()
  };
  const batchState: AutonomousBatchState = {
    runId: options.run.id,
    status: 'running',
    currentOuterRepeat: 0,
    totalOuterRepeats: options.run.repeat,
    tasks: options.run.tasks.map((task) => ({
      index: task.index,
      taskPath: task.taskPath,
      flowId: task.flowId,
      status: 'pending',
      currentRepeat: 0,
      attempts: 0,
      childSessionIds: []
    }))
  };

  await options.sessionStore.createSession(meta, {
    kind: 'run',
    targetId: options.run.id,
    engineId,
    dryRun: options.launch.dryRun,
    workDir: meta.workDir,
    extraPrompt: options.launch.extraPrompt
  });
  await options.sessionStore.writeBatch(sessionId, batchState);
  await options.sessionStore.appendEvent(sessionId, createAutonomousEvent('BATCH', `Run ${options.run.id} started.`));

  try {
    for (let outerRepeat = 1; outerRepeat <= options.run.repeat; outerRepeat += 1) {
      batchState.currentOuterRepeat = outerRepeat;
      for (const task of options.run.tasks) {
        const taskState = getTaskState(batchState, task.index);
        const flow = options.definitions.flows.find((candidate) => candidate.id === task.flowId);
        if (!flow) {
          throw new Error(`Flow ${task.flowId} is missing for task ${task.taskPath}.`);
        }

        taskState.status = 'running';
        await options.sessionStore.writeBatch(sessionId, batchState);
        for (let innerRepeat = 1; innerRepeat <= task.repeat; innerRepeat += 1) {
          if (options.signal.aborted) {
            throw new Error('Batch aborted.');
          }

          taskState.currentRepeat = innerRepeat;
          taskState.attempts += 1;
          await options.sessionStore.writeBatch(sessionId, batchState);
          await options.sessionStore.appendEvent(
            sessionId,
            createAutonomousEvent('BATCH', `Task ${task.index} repeat ${innerRepeat} started.`, {
              taskIndex: task.index,
              data: { outerRepeat }
            })
          );

          const child = await runAutonomousFlow({
            flow,
            workspaceRoot: options.workspaceRoot,
            workDir: meta.workDir,
            launch: {
              ...options.launch,
              dryRun: options.launch.dryRun,
              extraPrompt: task.body || options.launch.extraPrompt
            },
            sessionStore: options.sessionStore,
            engineRegistry: options.engineRegistry,
            signal: options.signal
          });
          taskState.childSessionIds.push(child.sessionId);
          if (child.state.status !== 'finished') {
            throw new Error(`Child flow ${child.sessionId} finished with status ${child.state.status}.`);
          }
        }

        if (!options.launch.dryRun && outerRepeat === options.run.repeat) {
          taskState.movedPath = await moveIssueToDone(options.run.sourcePath, task.taskPath);
          await options.sessionStore.appendEvent(
            sessionId,
            createAutonomousEvent('WRITE', `Task moved to ${taskState.movedPath}.`, { taskIndex: task.index })
          );
        }
        taskState.status = 'done';
        await options.sessionStore.writeBatch(sessionId, batchState);
      }
    }

    batchState.status = 'finished';
    meta.status = 'finished';
    meta.finishedAt = new Date().toISOString();
    await options.sessionStore.writeBatch(sessionId, batchState);
    await options.sessionStore.updateMeta(meta);
    await options.sessionStore.appendEvent(sessionId, createAutonomousEvent('DONE', `Run ${options.run.id} finished.`));
    return { sessionId, state: batchState };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    batchState.status = options.signal.aborted ? 'stopped' : 'error';
    markRunningTaskFailed(batchState, options.signal.aborted ? 'stopped' : 'failed', message);
    meta.status = options.signal.aborted ? 'stopped' : 'error';
    meta.finishedAt = new Date().toISOString();
    meta.error = message;
    await options.sessionStore.writeBatch(sessionId, batchState);
    await options.sessionStore.updateMeta(meta);
    await options.sessionStore.appendEvent(sessionId, createAutonomousEvent('ERROR', message, { level: 'error' }));
    return { sessionId, state: batchState };
  }
}

async function moveIssueToDone(runRoot: string, taskPath: string): Promise<string> {
  const sourcePath = path.resolve(runRoot, taskPath);
  const issuesRoot = path.resolve(runRoot, 'issues');
  const doneRoot = path.resolve(runRoot, 'done');
  const relativeToIssues = path.relative(issuesRoot, sourcePath);
  if (relativeToIssues.startsWith('..') || path.isAbsolute(relativeToIssues)) {
    throw new Error(`Task is not inside issues/: ${taskPath}`);
  }

  const targetPath = await dedupePath(path.join(doneRoot, relativeToIssues));
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.rename(sourcePath, targetPath);
  return path.relative(runRoot, targetPath);
}

async function dedupePath(targetPath: string): Promise<string> {
  const parsed = path.parse(targetPath);
  for (let index = 0; index < 1000; index += 1) {
    const candidate = index === 0 ? targetPath : path.join(parsed.dir, `${parsed.name}-${index}${parsed.ext}`);
    try {
      await fs.access(candidate);
    } catch {
      return candidate;
    }
  }
  throw new Error(`Cannot find free done path for ${targetPath}.`);
}

function getTaskState(batchState: AutonomousBatchState, taskIndex: number): AutonomousBatchTaskState {
  const taskState = batchState.tasks.find((candidate) => candidate.index === taskIndex);
  if (!taskState) {
    throw new Error(`Unknown task state: ${taskIndex}`);
  }
  return taskState;
}

function markRunningTaskFailed(batchState: AutonomousBatchState, status: 'failed' | 'stopped', error: string): void {
  const task = batchState.tasks.find((candidate) => candidate.status === 'running');
  if (!task) {
    return;
  }
  task.status = status;
  task.error = error;
}
