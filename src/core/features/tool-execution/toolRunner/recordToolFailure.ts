import { toStructuredToolFailure } from '../../../shared/lib/toolErrors';
import { buildModelToolResult } from '../toolResultCompaction';
import type { ToolRunnerRuntime } from './ToolRunnerRuntime';
import { emitToolFailed } from './events';
import { persistToolResult } from './persistToolResult';
import type { ToolRunnerHandleParams } from './types';

/**
 * Что это: входные данные для записи ошибки tool-call.
 * Зачем нужно: failure path использует те же args/reason/nextStep/runId, что и success path.
 * Какую продуктовую проблему решает: модель и UI получают понятный structured error и могут продолжить работу.
 */
export type RecordToolFailureInput = {
  runtime: ToolRunnerRuntime;
  params: ToolRunnerHandleParams;
  toolName: string;
  args: Record<string, unknown>;
  reason: string;
  nextStep: string | undefined;
  runId: string | undefined;
  toolMessageId: string;
  error: unknown;
};

/**
 * Что это: записывает structured failure в UI/model/run timeline.
 * Зачем нужно: ошибки tools должны быть видны модели как результат, а не теряться в логах.
 * Какую продуктовую проблему решает: агент может восстановиться после сбоя tool и объяснить проблему пользователю.
 */
export async function recordToolFailure(input: RecordToolFailureInput): Promise<void> {
  const { runtime, params, toolName, args, reason, nextStep, runId, toolMessageId, error } = input;
  const result = toStructuredToolFailure(error);
  runtime.deps.telemetry?.recordFailedEdit?.(toolName);
  const modelResult = buildModelToolResult(toolName, args, result);
  await runtime.deps.context.updateToolMessage(params.chat.id, toolMessageId, {
    status: 'error',
    reason,
    nextStep,
    args,
    result,
    modelResult
  });
  params.workingMessages.push({
    role: 'tool',
    tool_call_id: params.toolCall.id,
    content: JSON.stringify(modelResult, null, 2)
  });
  await persistToolResult({
    runtime,
    params,
    runId,
    messageId: toolMessageId,
    args,
    reason,
    nextStep,
    result,
    modelResult
  });
  await emitToolFailed({ runtime, params, runId, messageId: toolMessageId, args, reason, nextStep, result });
}
