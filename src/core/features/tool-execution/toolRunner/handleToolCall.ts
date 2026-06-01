import { toStructuredToolFailure } from '../../../shared/lib/toolErrors';
import { buildModelToolResult } from '../toolResultCompaction';
import { ToolCallDeniedError } from './ToolCallDeniedError';
import type { ToolRunnerRuntime } from './ToolRunnerRuntime';
import { emitToolCompleted, emitToolFailed, emitToolStarted } from './events';
import { getRunId } from './getRunId';
import { getToolNextStep } from './getToolNextStep';
import { getToolReason } from './getToolReason';
import { parseToolArguments } from './parseToolArguments';
import { persistToolResult } from './persistToolResult';
import { runApprovedTool } from './runApprovedTool';
import type { ToolExecutionPreview, ToolRunnerHandleParams } from './types';
import { waitForApproval } from './waitForApproval';
import { withApprovalComment } from './withApprovalComment';

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

/** Что это: создаёт initial tool message и event started; зачем нужно: UI сразу показывает waiting tool row; проблема: пользователь видит прогресс до approval/run. */
async function appendInitialToolMessage({ runtime, params, toolName, args, reason, nextStep, runId }: InitialInput) {
  const toolMessage = await runtime.deps.context.appendToolMessage(params.chat.id, {
    role: 'tool',
    name: toolName,
    status: 'waiting',
    reason,
    nextStep,
    args
  });
  await runtime.deps.context.setActivity(
    params.chat.id,
    'thinking',
    runtime.activityFormatter.prepare(toolName, reason)
  );
  await emitToolStarted({ runtime, params, runId, messageId: toolMessage.id, args, reason, nextStep });
  runtime.deps.context.sendState?.();
  return toolMessage;
}

/** Что это: выполняет approved tool и записывает done/error result; зачем нужно: основной success path отделён от approval setup; проблема: проще поддерживать persistence/events. */
async function runToolAndRecordResult({
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
  previewHandle,
  approvalComment
}: RunInput): Promise<void> {
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
    result: await runApprovedTool({ runtime, toolName, args, chatId: params.chat.id, previewHandle }),
    comment: approvalComment
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

/** Что это: записывает structured failure в UI/model/run timeline; зачем нужно: ошибки tools должны быть видны модели как result; проблема: агент может восстановиться после сбоя. */
async function recordToolFailure({
  runtime,
  params,
  toolName,
  args,
  reason,
  nextStep,
  runId,
  toolMessageId,
  error
}: FailureInput): Promise<void> {
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

type BaseInput = {
  runtime: ToolRunnerRuntime;
  params: ToolRunnerHandleParams;
  toolName: string;
  args: Record<string, unknown>;
  reason: string;
  nextStep: string | undefined;
  runId: string | undefined;
};
type InitialInput = BaseInput;
type RunInput = BaseInput & {
  toolMessageId: string;
  permission: string;
  preview: Record<string, unknown> | undefined;
  previewHandle: ToolExecutionPreview | undefined;
  approvalComment: string | undefined;
};
type FailureInput = BaseInput & { toolMessageId: string; error: unknown };
