import type { ToolRunnerRuntime } from './ToolRunnerRuntime';
import { normalizeReasoningEffort } from './normalizeReasoningEffort';

/**
 * Что это: выполняет spawn_agent через внешний adapter дочерних агентов.
 * Зачем нужно: основная модель может ждать результат или запустить помощника в фоне.
 * Какую продуктовую проблему решает: независимое исследование проекта не блокирует весь сценарий, если результат нужен не сразу.
 */
export async function runAgentTool({
  runtime,
  args,
  chatId,
  runSignal
}: {
  runtime: ToolRunnerRuntime;
  args: Record<string, unknown>;
  chatId: string;
  runSignal?: AbortSignal;
}): Promise<Record<string, unknown>> {
  if (!runtime.deps.agentService) throw new Error('Agent spawning adapter is not configured.');

  const prompt = typeof args.prompt === 'string' ? args.prompt.trim() : '';
  if (!prompt) throw new Error('spawn_agent requires a non-empty prompt.');

  const mode = args.mode === 'background' ? 'background' : 'wait';
  const title = typeof args.title === 'string' && args.title.trim() ? args.title.trim() : undefined;
  const system = typeof args.system === 'string' && args.system.trim() ? args.system.trim() : undefined;
  const model = typeof args.model === 'string' && args.model.trim() ? args.model.trim() : undefined;
  const reasoningEffort = normalizeReasoningEffort({ value: args.reasoningEffort });
  const allowTools = typeof args.allowTools === 'boolean' ? args.allowTools : undefined;

  return runtime.deps.agentService.spawn({
    parentChatId: chatId,
    prompt,
    system,
    title,
    mode,
    model,
    reasoningEffort,
    allowTools,
    signal: runSignal
  });
}
