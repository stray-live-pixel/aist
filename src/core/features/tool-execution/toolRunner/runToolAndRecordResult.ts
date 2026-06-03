import { buildModelToolResult } from '../toolResultCompaction';
import type { ToolRunnerRuntime } from './ToolRunnerRuntime';
import { emitToolCompleted } from './events';
import { persistToolResult } from './persistToolResult';
import { runApprovedTool } from './runApprovedTool';
import type { ToolExecutionPreview, ToolRunnerHandleParams } from './types';
import { withApprovalComment } from './withApprovalComment';

/**
 * Что это: входные данные выполнения уже разрешённого tool-call.
 * Зачем нужно: success path отделён от approval setup и error handling.
 * Какую продуктовую проблему решает: tool result одинаково попадает в UI, model context и run timeline.
 */
export type RunToolAndRecordResultInput = {
  runtime: ToolRunnerRuntime;
  params: ToolRunnerHandleParams;
  toolName: string;
  args: Record<string, unknown>;
  reason: string;
  nextStep: string | undefined;
  runId: string | undefined;
  toolMessageId: string;
  permission: string;
  preview: Record<string, unknown> | undefined;
  previewHandle: ToolExecutionPreview | undefined;
  approvalComment: string | undefined;
};

/**
 * Что это: выполняет approved tool и записывает done/error result.
 * Зачем нужно: основной success path обновляет activity, message, model history, persistence и events.
 * Какую продуктовую проблему решает: после tool-call агент и пользователь видят один согласованный результат.
 */
export async function runToolAndRecordResult(input: RunToolAndRecordResultInput): Promise<void> {
  const {
    runtime,
    params,
    toolName,
    args,
    reason,
    nextStep,
    runId,
    toolMessageId,
    permission,
    preview,
    previewHandle
  } = input;
  runtime.deps.context.throwIfStopped(params.run);
  await runtime.deps.context.setActivity(
    params.chat.id,
    'runningTool',
    runtime.activityFormatter.runningTool(toolName, reason)
  );
  await runtime.deps.context.updateToolMessage(params.chat.id, toolMessageId, {
    status: 'running',
    approval: permission === 'ask' ? 'approved' : undefined,
    reason,
    nextStep,
    args,
    result: preview ? { preview } : undefined
  });
  runtime.deps.context.sendState?.();

  const result = withApprovalComment({
    result: await runApprovedTool({ runtime, toolName, args, chatId: params.chat.id, run: params.run, previewHandle }),
    comment: input.approvalComment
  });
  if (result.ok === false) runtime.deps.telemetry?.recordFailedEdit?.(toolName);

  const uiResult = preview ? { preview, result } : result;
  const modelResult = buildModelToolResult(toolName, args, uiResult);
  await runtime.deps.context.updateToolMessage(params.chat.id, toolMessageId, {
    status: result.ok === false ? 'error' : 'done',
    reason,
    nextStep,
    args,
    result: uiResult,
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
    result: uiResult,
    modelResult
  });
  await emitToolCompleted({
    runtime,
    params,
    runId,
    messageId: toolMessageId,
    args,
    reason,
    nextStep,
    result: uiResult,
    modelResult
  });
}
