import type { ToolApprovalRequest } from '../../../shared/types/types';
import { createToolApprovalRequest, normalizeToolApprovalDecision } from '../../approval/approvalProtocol';
import { ToolCallDeniedError } from './ToolCallDeniedError';
import type { ToolRunnerRuntime } from './ToolRunnerRuntime';
import { denyToolCall } from './denyToolCall';
import { emitApprovalRequested, emitApprovalResolved } from './events';
import { saveApprovalMemory } from './saveApprovalMemory';
import { toToolCallSnapshot } from './toToolCallSnapshot';
import type { ToolExecutionPreview, ToolRunnerHandleParams } from './types';

/**
 * Что это: полный approval flow для tool-call в режиме ask.
 * Зачем нужно: preview, status, repository, events, memory и deny/approve должны обрабатываться в одном сценарии.
 * Какую продуктовую проблему решает: опасные действия агента подтверждаются пользователем и сохраняют историю решения.
 */
export async function waitForApproval({
  runtime,
  params
}: {
  runtime: ToolRunnerRuntime;
  params: ApprovalFlowParams;
}): Promise<{ approved: boolean; comment?: string }> {
  await showApprovalWaitingState({ runtime, params });
  const approval = buildApprovalRequest({ params });
  await persistApprovalRequested({ runtime, params, approval });
  await emitApprovalRequested({ runtime, params, approvalId: approval?.approvalId, approval });

  runtime.deps.telemetry?.recordApprovalRequested?.();
  const decision = normalizeToolApprovalDecision(
    await runtime.deps.approvalService.requestApproval({
      chat: params.chat,
      run: params.run,
      toolCall: params.toolCall,
      messageId: params.toolMessageId,
      reason: params.reason,
      nextStep: params.nextStep,
      args: params.args,
      preview: params.preview
    })
  );
  runtime.deps.telemetry?.recordApprovalDecision?.(decision.approved);
  await saveApprovalMemory({ runtime, decision });
  runtime.deps.context.sendState?.();

  const resolvedApproval = approval
    ? { ...approval, status: decision.approved ? ('approved' as const) : ('denied' as const), updatedAt: runtime.now() }
    : undefined;
  await persistApprovalResolved({ runtime, params, resolvedApproval, decision });
  await emitApprovalResolved({
    runtime,
    params,
    approvalId: resolvedApproval?.approvalId,
    approval: resolvedApproval,
    decision
  });

  if (!decision.approved) {
    await denyToolCall({ runtime, params, decision });
    if (!decision.continueAfterDeny) {
      params.run.stopRequested = true;
      throw new ToolCallDeniedError();
    }
    return { approved: false };
  }

  return { approved: true, comment: decision.comment };
}

/** Что это: обновляет chat message/activity перед ожиданием approval; зачем нужно: UI показывает pending approval и preview; проблема: пользователь видит, что нужно решить. */
async function showApprovalWaitingState({
  runtime,
  params
}: {
  runtime: ToolRunnerRuntime;
  params: ApprovalFlowParams;
}): Promise<void> {
  if (params.preview) {
    await runtime.deps.context.updateToolMessage(params.chat.id, params.toolMessageId, {
      result: { preview: params.preview }
    });
    runtime.deps.context.sendState?.();
  }

  await runtime.deps.context.setActivity(
    params.chat.id,
    'waitingForApproval',
    runtime.activityFormatter.waitingApproval(params.toolCall.function.name, params.reason)
  );
  await runtime.deps.context.updateToolMessage(params.chat.id, params.toolMessageId, {
    status: 'waiting',
    approval: 'pending',
    result: params.preview ? { preview: params.preview } : undefined
  });
  runtime.deps.context.sendState?.();
}

/** Что это: создаёт approval protocol object, если есть runId; зачем нужно: approval должен иметь stable approvalId; проблема: reconnect может найти pending approval. */
function buildApprovalRequest({ params }: { params: ApprovalFlowParams }): ToolApprovalRequest | undefined {
  return params.runId
    ? createToolApprovalRequest({
        runId: params.runId,
        chatId: params.chat.id,
        messageId: params.toolMessageId,
        toolCallId: params.toolCall.id,
        toolName: params.toolCall.function.name,
        reason: params.reason,
        args: params.args,
        previewKind: params.preview ? params.previewHandle?.approvalPreviewKind || 'headless-diff-artifact' : 'none'
      })
    : undefined;
}

/** Что это: сохраняет requested approval в run repository; зачем нужно: pending approval виден после reconnect; проблема: пользователь не теряет запрос решения. */
async function persistApprovalRequested({ runtime, params, approval }: PersistRequestedInput): Promise<void> {
  if (!params.runId || !approval) return;
  await runtime.deps.runRepository?.appendApproval?.(params.runId, {
    chatId: params.chat.id,
    messageId: params.toolMessageId,
    approvalId: approval.approvalId,
    status: 'requested',
    approval,
    toolCall: toToolCallSnapshot({
      toolCall: params.toolCall,
      args: params.args,
      reason: params.reason,
      nextStep: params.nextStep
    })
  });
}

/** Что это: сохраняет resolved approval в run repository; зачем нужно: approve/deny decision persist-ится; проблема: история run объясняет, почему tool был выполнен/отклонён. */
async function persistApprovalResolved({
  runtime,
  params,
  resolvedApproval,
  decision
}: PersistResolvedInput): Promise<void> {
  if (!params.runId || !resolvedApproval) return;
  await runtime.deps.runRepository?.appendApproval?.(params.runId, {
    chatId: params.chat.id,
    messageId: params.toolMessageId,
    approvalId: resolvedApproval.approvalId,
    status: resolvedApproval.status,
    approval: resolvedApproval,
    decision,
    resolvedAt: resolvedApproval.updatedAt,
    toolCall: toToolCallSnapshot({
      toolCall: params.toolCall,
      args: params.args,
      reason: params.reason,
      nextStep: params.nextStep
    })
  });
}

export type ApprovalFlowParams = ToolRunnerHandleParams & {
  runId: string | undefined;
  toolMessageId: string;
  reason: string;
  nextStep?: string;
  args: Record<string, unknown>;
  preview: Record<string, unknown> | undefined;
  previewHandle: ToolExecutionPreview | undefined;
};
type PersistRequestedInput = {
  runtime: ToolRunnerRuntime;
  params: ApprovalFlowParams;
  approval: ToolApprovalRequest | undefined;
};
type PersistResolvedInput = {
  runtime: ToolRunnerRuntime;
  params: ApprovalFlowParams;
  resolvedApproval: ToolApprovalRequest | undefined;
  decision: ReturnType<typeof normalizeToolApprovalDecision>;
};
