import type { ToolRunnerRuntime } from './ToolRunnerRuntime';
import { toRuntimeToolResult } from './jsonConversion';
import { toToolCallSnapshot } from './toToolCallSnapshot';
import type { ToolRunnerHandleParams } from './types';

/**
 * Что это: сохраняет tool result в run repository.
 * Зачем нужно: run timeline должен переживать reconnect и показывать modelResult отдельно от UI-result.
 * Какую продуктовую проблему решает: пользователь не теряет историю выполненных tools после перезапуска.
 */
export async function persistToolResult({
  runtime,
  params,
  runId,
  messageId,
  args,
  reason,
  nextStep,
  result,
  modelResult
}: {
  runtime: ToolRunnerRuntime;
  params: ToolRunnerHandleParams;
  runId: string | undefined;
  messageId: string;
  args: Record<string, unknown>;
  reason: string;
  nextStep: string | undefined;
  result: Record<string, unknown>;
  modelResult: Record<string, unknown>;
}): Promise<void> {
  if (!runId) return;
  await runtime.deps.runRepository?.appendToolResult?.(runId, {
    chatId: params.chat.id,
    messageId,
    toolCall: toToolCallSnapshot({ toolCall: params.toolCall, args, reason, nextStep }),
    result: toRuntimeToolResult({ result }),
    modelResult: toRuntimeToolResult({ result: modelResult })
  });
}
