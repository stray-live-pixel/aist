import type { AutonomousFlowDefinition, AutonomousStageDefinition, AutonomousStageRunState } from '../types';

export type ResolvedStageContext = {
  sessionRef?: string;
  forkFromSessionRef?: string;
  diagnostics: string[];
};

/**
 * Валидирует context links этапа до запуска engine. Это защищает от старой
 * ошибки, когда некорректный `from` проявлялся только внутри Python runtime и UI
 * не мог заранее показать причину отказа.
 */
export function resolveStageContext(
  flow: AutonomousFlowDefinition,
  stage: AutonomousStageDefinition,
  completedStages: AutonomousStageRunState[],
  engineCapabilities: { resume: boolean; fork: boolean }
): ResolvedStageContext {
  const diagnostics: string[] = [];
  let sessionRef: string | undefined;
  let forkFromSessionRef: string | undefined;
  let resumeContextCount = 0;

  for (const context of stage.contexts) {
    const sourceIndex = context.from ?? stage.index - 1;
    if (
      sourceIndex < 1 ||
      sourceIndex >= stage.index ||
      !flow.stages.some((candidate) => candidate.index === sourceIndex)
    ) {
      diagnostics.push(`Stage ${stage.index} references invalid context source ${sourceIndex}.`);
      continue;
    }

    const sourceRun = completedStages.find((candidate) => candidate.index === sourceIndex);
    if ((context.mode === 'continue' || context.mode === 'continue-from') && !sourceRun?.sessionRef) {
      diagnostics.push(`Stage ${stage.index} cannot ${context.mode} from ${sourceIndex}: sessionRef is missing.`);
      continue;
    }

    if (context.mode === 'continue') {
      resumeContextCount += 1;
      if (engineCapabilities.resume) {
        sessionRef = sourceRun?.sessionRef;
      } else {
        diagnostics.push('Engine does not support native resume; prompt-level fallback will be used.');
      }
    }

    if (context.mode === 'continue-from') {
      resumeContextCount += 1;
      if (engineCapabilities.fork) {
        forkFromSessionRef = sourceRun?.sessionRef;
      } else {
        diagnostics.push('Engine does not support native fork; prompt-level fallback will be used.');
      }
    }
  }

  if (resumeContextCount > 1) {
    diagnostics.push(`Stage ${stage.index} has more than one resume/fork context.`);
  }

  return { sessionRef, forkFromSessionRef, diagnostics };
}
