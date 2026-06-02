import { ToolCallDeniedError } from './ToolCallDeniedError';
import type { ToolRunnerRuntime } from './ToolRunnerRuntime';
import { appendInitialToolMessage } from './appendInitialToolMessage';
import { getRunId } from './getRunId';
import { getToolNextStep } from './getToolNextStep';
import { getToolReason } from './getToolReason';
import { parseToolArguments } from './parseToolArguments';
import { recordToolFailure } from './recordToolFailure';
import { runToolAndRecordResult } from './runToolAndRecordResult';
import type { ToolExecutionPreview, ToolRunnerHandleParams } from './types';
import { waitForApproval } from './waitForApproval';

/**
 * Что это: полный lifecycle обработки одного model tool-call.
 * Зачем нужно: создаёт tool message, approval, выполнение, model result, events и persistence.
 * Какую продуктовую проблему решает: агент безопасно выполняет tools и сохраняет понятную историю для UI/model.
 */
export async function handleToolCall({
  runtime,
  params
}: {
  runtime: ToolRunnerRuntime;
  params: ToolRunnerHandleParams;
}): Promise<void> {
  const toolName = params.toolCall.function.name;
  const runId = getRunId({ runtime, params });
  const args = parseToolArguments({ rawArgs: params.toolCall.function.arguments });
  const reason = getToolReason({ args });
  const nextStep = getToolNextStep({ args });
  runtime.deps.telemetry?.recordToolStarted?.(toolName);

  const toolMessage = await appendInitialToolMessage({ runtime, params, toolName, args, reason, nextStep, runId });
  let previewHandle: ToolExecutionPreview | undefined;
  let preview: Record<string, unknown> | undefined;

  try {
    runtime.deps.context.throwIfStopped(params.run);
    const permission = runtime.deps.approvalService.getPermission(toolName, args);
    const registeredTool = runtime.deps.registry.getTool(toolName);

    if (permission === 'ask') {
      previewHandle =
        !registeredTool || registeredTool.kind === 'builtin'
          ? await runtime.deps.preview?.prepare(toolName, args)
          : undefined;
      preview = previewHandle?.preview;
      const approval = await waitForApproval({
        runtime,
        params: { ...params, runId, toolMessageId: toolMessage.id, reason, nextStep, args, preview, previewHandle }
      });
      if (!approval.approved) return;
      if (approval.comment) toolMessage.userApprovalComment = approval.comment;
    }

    await runToolAndRecordResult({
      runtime,
      params,
      toolName,
      args,
      reason,
      nextStep,
      runId,
      toolMessageId: toolMessage.id,
      permission,
      preview,
      previewHandle,
      approvalComment: toolMessage.userApprovalComment
    });
  } catch (error) {
    if (error instanceof ToolCallDeniedError) {
      if (params.run.stopRequested) throw error;
      return;
    }
    await recordToolFailure({
      runtime,
      params,
      toolName,
      args,
      reason,
      nextStep,
      runId,
      toolMessageId: toolMessage.id,
      error
    });
  } finally {
    await previewHandle?.cleanup();
  }

  runtime.deps.context.sendState?.();
}
