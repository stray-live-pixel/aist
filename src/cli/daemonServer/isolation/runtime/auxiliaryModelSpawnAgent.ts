import type { AuxiliaryModelInvoker } from '../../../../core/entities/model/auxiliaryModel';
import { contentToText } from '../../../../core/entities/model/contentToText';
import type { ToolRunnerSpawnAgentInput } from '../../../../core/features/tool-execution/toolRunner';
import type { OpenRouterMessage } from '../../../../core/shared/types/types';

/**
 * Что это: зависимости isolated-adapter для spawn_agent.
 * Зачем нужно: isolated runtime запускает параллельное исследование через auxiliary model без доступа к обычному daemon subagent lifecycle.
 * Какую продуктовую проблему решает: большая задача может исследовать независимые части параллельно, а изменения остаются в главном isolated worktree.
 */
export type AuxiliaryModelSpawnAgentInput = {
  readonly auxiliaryModel: AuxiliaryModelInvoker;
  readonly input: ToolRunnerSpawnAgentInput;
};

/**
 * Что это: выполняет spawn_agent внутри isolated runtime через auxiliary model.
 * Зачем нужно: у detached isolated run нет подключённого UI-subagent процесса, но нужен parallel-safe research tool.
 * Какую продуктовую проблему решает: агент может декомпозировать сложную задачу и параллельно собрать контекст перед последовательными commit-шагами.
 */
export async function auxiliaryModelSpawnAgent({
  auxiliaryModel,
  input
}: AuxiliaryModelSpawnAgentInput): Promise<Record<string, unknown>> {
  const messages = createSpawnAgentMessages({ input });
  const invoke = () =>
    auxiliaryModel.invoke({
      model: input.model,
      reasoningEffort: input.reasoningEffort,
      signal: input.signal,
      messages
    });

  if (input.mode === 'background') {
    void invoke().catch(() => undefined);
    return {
      ok: true,
      mode: 'background',
      title: input.title || 'Isolated subagent',
      status: 'running',
      message: 'Isolated subagent was started in background for parallel-safe investigation.'
    };
  }

  const response = await invoke();
  return {
    ok: true,
    mode: input.mode,
    title: input.title || 'Isolated subagent',
    status: 'success',
    content: contentToText({ content: response.content }),
    reasoning: response.reasoning,
    usage: response.usage
  };
}

/**
 * Что это: собирает prompt дочернего агента в формате model messages.
 * Зачем нужно: system-инструкция остаётся отдельной от пользовательской задачи.
 * Какую продуктовую проблему решает: параллельный помощник получает чёткий контекст и возвращает пригодный для основной итерации summary.
 */
function createSpawnAgentMessages({ input }: { input: ToolRunnerSpawnAgentInput }): OpenRouterMessage[] {
  return [
    ...(input.system ? [{ role: 'system' as const, content: input.system }] : []),
    { role: 'user' as const, content: input.prompt }
  ];
}
