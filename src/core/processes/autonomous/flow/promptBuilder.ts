import type { AutonomousStageDefinition, AutonomousStageRunState } from '../types';

export type BuildStagePromptOptions = {
  stage: AutonomousStageDefinition;
  previousStages: AutonomousStageRunState[];
  extraPrompt?: string;
};

/**
 * Собирает prompt этапа из extra prompt, context summaries/results и тела stage.
 * Почему это отдельный модуль: CLI/API engines не должны знать про Markdown
 * definitions, а orchestrator не должен заниматься форматированием больших prompt.
 */
export function buildStagePrompt(options: BuildStagePromptOptions): string {
  const parts: string[] = [];
  if (options.extraPrompt?.trim()) {
    parts.push(`# Extra prompt\n\n${options.extraPrompt.trim()}`);
  }

  for (const context of options.stage.contexts) {
    const sourceIndex = context.from ?? options.stage.index - 1;
    const sourceStage = options.previousStages.find((stage) => stage.index === sourceIndex);
    if (!sourceStage?.result) {
      continue;
    }

    const title = context.mode === 'summary-from' ? 'Summary context' : 'Previous stage context';
    parts.push(`## ${title} from stage ${sourceIndex}\n\n${sourceStage.result}`);
  }

  parts.push(options.stage.body);
  return parts.filter(Boolean).join('\n\n---\n\n');
}

export function resolveStageModel(
  stage: AutonomousStageDefinition,
  defaultModel?: string,
  defaultCodexModel?: string
): string | undefined {
  return stage.codexModel || stage.model || defaultCodexModel || defaultModel;
}
