import type { AutonomousEngineRegistry } from '../engines/types';
import { AutonomousSessionStore, createAutonomousEvent } from '../storage/sessionStore';
import type {
  AutonomousCommandState,
  AutonomousEngineId,
  AutonomousFlowDefinition,
  AutonomousFlowState,
  AutonomousLaunchOptions,
  AutonomousSessionMeta,
  AutonomousStageRunState
} from '../types';
import { resolveStageContext } from './contextResolver';
import { buildStagePrompt, resolveStageModel } from './promptBuilder';

export type RunFlowOptions = {
  flow: AutonomousFlowDefinition;
  workspaceRoot: string;
  workDir: string;
  launch: AutonomousLaunchOptions;
  sessionStore: AutonomousSessionStore;
  engineRegistry: AutonomousEngineRegistry;
  signal: AbortSignal;
  sessionId?: string;
};

export type RunFlowResult = {
  sessionId: string;
  state: AutonomousFlowState;
};

/**
 * Исполняет multi-stage flow последовательно через abstract engine. Orchestrator
 * не импортирует VS Code API и не знает про webview: так сохраняется возможность
 * переиспользовать core runtime в будущей desktop/standalone оболочке.
 */
export async function runAutonomousFlow(options: RunFlowOptions): Promise<RunFlowResult> {
  const sessionId = options.sessionId || createSessionId('flow');
  const engineId: AutonomousEngineId = options.launch.dryRun ? 'dry-run' : options.launch.engineId;
  const engine = options.engineRegistry.get(engineId);
  const startedAt = new Date().toISOString();
  const meta: AutonomousSessionMeta = {
    id: sessionId,
    kind: 'flow',
    targetId: options.flow.id,
    status: 'running',
    engineId,
    workspaceRoot: options.workspaceRoot,
    workDir: options.workDir,
    startedAt
  };
  const command: AutonomousCommandState = {
    kind: 'flow',
    targetId: options.flow.id,
    engineId,
    dryRun: options.launch.dryRun,
    workDir: options.workDir,
    extraPrompt: options.launch.extraPrompt
  };
  const flowState: AutonomousFlowState = {
    flowId: options.flow.id,
    status: 'running',
    stages: options.flow.stages.map(toPendingStage)
  };

  await options.sessionStore.createSession(meta, command);
  await options.sessionStore.writeFlow(sessionId, flowState);
  await options.sessionStore.appendEvent(sessionId, createAutonomousEvent('FLOW', `Flow ${options.flow.id} started.`));

  try {
    for (const stage of options.flow.stages) {
      if (options.signal.aborted) {
        throw new Error('Flow aborted.');
      }

      const stageState = getStageState(flowState, stage.index);
      stageState.status = 'running';
      stageState.startedAt = new Date().toISOString();
      stageState.model = resolveStageModel(stage, options.flow.defaultModel, options.flow.defaultCodexModel);
      flowState.currentStageIndex = stage.index;
      await options.sessionStore.writeFlow(sessionId, flowState);
      await options.sessionStore.appendEvent(
        sessionId,
        createAutonomousEvent('STAGE', `Stage ${stage.index}: ${stage.title} started.`, { stageIndex: stage.index })
      );

      const context = resolveStageContext(options.flow, stage, flowState.stages, engine.capabilities);
      for (const diagnostic of context.diagnostics) {
        await options.sessionStore.appendEvent(
          sessionId,
          createAutonomousEvent('STAGE_CTX', diagnostic, { level: 'warning', stageIndex: stage.index })
        );
      }

      const result = await engine.run({
        prompt: buildStagePrompt({ stage, previousStages: flowState.stages, extraPrompt: options.launch.extraPrompt }),
        model: stageState.model,
        workDir: options.workDir,
        stageIndex: stage.index,
        sessionRef: context.sessionRef,
        forkFromSessionRef: context.forkFromSessionRef,
        signal: options.signal,
        onEvent: (event) => options.sessionStore.appendEvent(sessionId, event)
      });

      stageState.status = 'done';
      stageState.finishedAt = new Date().toISOString();
      stageState.sessionRef = result.sessionRef;
      stageState.result = result.result;
      await options.sessionStore.writeFlow(sessionId, flowState);
      await options.sessionStore.appendEvent(
        sessionId,
        createAutonomousEvent('DONE', `Stage ${stage.index}: ${stage.title} finished.`, { stageIndex: stage.index })
      );
    }

    flowState.status = 'finished';
    meta.status = 'finished';
    meta.finishedAt = new Date().toISOString();
    await options.sessionStore.writeFlow(sessionId, flowState);
    await options.sessionStore.updateMeta(meta);
    await options.sessionStore.appendEvent(
      sessionId,
      createAutonomousEvent('DONE', `Flow ${options.flow.id} finished.`)
    );
    return { sessionId, state: flowState };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stopped = options.signal.aborted;
    flowState.status = stopped ? 'stopped' : 'error';
    meta.status = stopped ? 'stopped' : 'error';
    meta.finishedAt = new Date().toISOString();
    meta.error = message;
    if (flowState.currentStageIndex) {
      const stageState = getStageState(flowState, flowState.currentStageIndex);
      stageState.status = stopped ? 'stopped' : 'error';
      stageState.finishedAt = new Date().toISOString();
      stageState.error = message;
    }
    await options.sessionStore.writeFlow(sessionId, flowState);
    await options.sessionStore.updateMeta(meta);
    await options.sessionStore.appendEvent(sessionId, createAutonomousEvent('ERROR', message, { level: 'error' }));
    return { sessionId, state: flowState };
  }
}

export function createSessionId(prefix: string): string {
  return `${prefix}-${new Date().toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 8)}`;
}

function toPendingStage(stage: AutonomousFlowDefinition['stages'][number]): AutonomousStageRunState {
  return { index: stage.index, title: stage.title, status: 'pending' };
}

function getStageState(flowState: AutonomousFlowState, stageIndex: number): AutonomousStageRunState {
  const stageState = flowState.stages.find((candidate) => candidate.index === stageIndex);
  if (!stageState) {
    throw new Error(`Unknown stage state: ${stageIndex}`);
  }
  return stageState;
}
