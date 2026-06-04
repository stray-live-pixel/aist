import type { AutonomousEngine, AutonomousEngineRunRequest } from '../../../../core/processes/autonomous/engines/types';
import { createAutonomousEvent } from '../../../../core/processes/autonomous/storage/sessionStore';
import type { IsolationSessionSummary } from '../../../daemonProtocol';
import type { LocalDockerIsolationProvider } from '../LocalDockerIsolationProvider';

export const ISOLATED_AGENT_ENGINE_ID = 'aist-isolated-agent';

export type IsolatedAgentAutonomousEngineRunInput = {
  readonly session: IsolationSessionSummary;
  readonly runPrompt: string;
  readonly worktreePath: string;
  readonly containerName: string;
  readonly dockerProvider: LocalDockerIsolationProvider;
  readonly stageIndex?: number;
  readonly model?: string;
  readonly registerStopHandler?: (handler: () => void) => void;
};

export type CreateIsolatedAgentAutonomousEngineOptions = {
  readonly session: IsolationSessionSummary;
  readonly worktreePath: string;
  readonly containerName: string;
  readonly dockerProvider: LocalDockerIsolationProvider;
  readonly runAgent: (input: IsolatedAgentAutonomousEngineRunInput) => Promise<{ runId?: string; answer?: string }>;
  readonly registerStopHandler?: (handler: () => void) => void;
};

/**
 * Что это: adapter AutonomousEngine поверх обычного AIST isolated runtime.
 * Зачем нужно: core flow-orchestrator управляет стадиями, а daemon isolation слой
 * предоставляет stage execution с Docker/worktree/tools.
 */
export function createIsolatedAgentAutonomousEngine(
  options: CreateIsolatedAgentAutonomousEngineOptions
): AutonomousEngine {
  return {
    id: ISOLATED_AGENT_ENGINE_ID,
    label: 'AIST isolated agent',
    capabilities: { resume: true, fork: false, tools: true },
    async run(request) {
      return runIsolatedStage({ options, request });
    }
  };
}

async function runIsolatedStage({
  options,
  request
}: {
  options: CreateIsolatedAgentAutonomousEngineOptions;
  request: AutonomousEngineRunRequest;
}) {
  const stageIndex = request.stageIndex;
  await request.onEvent(
    createAutonomousEvent('SYS', `Starting isolated agent stage ${stageIndex ?? 0}.`, { stageIndex })
  );

  const result = await options.runAgent({
    session: options.session,
    runPrompt: request.prompt,
    worktreePath: options.worktreePath,
    containerName: options.containerName,
    dockerProvider: options.dockerProvider,
    stageIndex,
    model: request.model,
    registerStopHandler: options.registerStopHandler
  });
  const answer = result.answer?.trim() || `Isolated agent run ${result.runId || 'unknown'} finished.`;
  await request.onEvent(createAutonomousEvent('ASSISTANT', answer, { stageIndex }));
  return {
    result: answer,
    sessionRef: request.sessionRef || options.session.chatId
  };
}
