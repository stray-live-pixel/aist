import type { ToolApprovalDecision, ToolApprovalRequest } from '../../../shared/types/types';
import type { ToolRunnerRuntime } from './ToolRunnerRuntime';
import { toRuntimeToolResult } from './jsonConversion';
import { toToolCallSnapshot } from './toToolCallSnapshot';
import type { ToolRunnerHandleParams } from './types';

/** Что это: emit старта tool-call; зачем нужно: timeline показывает начало выполнения; проблема: пользователь видит прогресс до результата. */
export async function emitToolStarted({
  runtime,
  params,
  runId,
  messageId,
  args,
  reason,
  nextStep
}: CommonEventInput): Promise<void> {
  if (!runId) return;
  await runtime.deps.events?.emit({
    type: 'tool.call.started',
    runId,
    chatId: params.chat.id,
    messageId,
    toolCall: toToolCallSnapshot({ toolCall: params.toolCall, args, reason, nextStep }),
    at: runtime.now()
  });
}

/** Что это: emit approval requested; зачем нужно: timeline показывает ожидание решения; проблема: approvals можно восстановить после reconnect. */
export async function emitApprovalRequested({
  runtime,
  params,
  approvalId,
  approval
}: ApprovalRequestedInput): Promise<void> {
  if (!params.runId || !approvalId || !approval) return;
  await runtime.deps.events?.emit({
    type: 'tool.call.approvalRequested',
    runId: params.runId,
    chatId: params.chat.id,
    approvalId,
    messageId: params.toolMessageId,
    approval,
    toolCall: toToolCallSnapshot({
      toolCall: params.toolCall,
      args: params.args,
      reason: params.reason,
      nextStep: params.nextStep
    }),
    preview: params.preview ? toRuntimeToolResult({ result: params.preview }) : undefined,
    at: runtime.now()
  });
}

/** Что это: emit approval resolved; зачем нужно: timeline фиксирует approve/deny; проблема: история решений пользователя не теряется. */
export async function emitApprovalResolved({
  runtime,
  params,
  approvalId,
  approval,
  decision
}: ApprovalResolvedInput): Promise<void> {
  if (!params.runId || !approvalId) return;
  await runtime.deps.events?.emit({
    type: 'tool.call.approvalResolved',
    runId: params.runId,
    chatId: params.chat.id,
    approvalId,
    messageId: params.toolMessageId,
    approval,
    decision,
    at: runtime.now()
  });
}

/** Что это: emit успешного завершения tool-call; зачем нужно: runtime stream получает UI/model results; проблема: run details показывают итог tool. */
export async function emitToolCompleted({
  runtime,
  params,
  runId,
  messageId,
  args,
  reason,
  nextStep,
  result,
  modelResult
}: CompletedEventInput): Promise<void> {
  if (!runId) return;
  await runtime.deps.events?.emit({
    type: 'tool.call.completed',
    runId,
    chatId: params.chat.id,
    messageId,
    toolCall: toToolCallSnapshot({ toolCall: params.toolCall, args, reason, nextStep }),
    result: toRuntimeToolResult({ result }),
    modelResult: toRuntimeToolResult({ result: modelResult }),
    at: runtime.now()
  });
}

/** Что это: emit технической ошибки tool-call; зачем нужно: timeline отличает failure от deny; проблема: пользователь видит код/сообщение ошибки. */
export async function emitToolFailed({
  runtime,
  params,
  runId,
  messageId,
  args,
  reason,
  nextStep,
  result
}: FailedEventInput): Promise<void> {
  if (!runId) return;
  await runtime.deps.events?.emit({
    type: 'tool.call.failed',
    runId,
    chatId: params.chat.id,
    messageId,
    toolCall: toToolCallSnapshot({ toolCall: params.toolCall, args, reason, nextStep }),
    error: {
      message: typeof result.error === 'string' ? result.error : 'Tool execution failed.',
      code: typeof result.code === 'string' ? result.code : undefined
    },
    at: runtime.now()
  });
}

type CommonEventInput = {
  runtime: ToolRunnerRuntime;
  params: ToolRunnerHandleParams;
  runId: string | undefined;
  messageId: string;
  args: Record<string, unknown>;
  reason: string;
  nextStep: string | undefined;
};
type CompletedEventInput = CommonEventInput & { result: Record<string, unknown>; modelResult: Record<string, unknown> };
type FailedEventInput = CommonEventInput & { result: Record<string, unknown> };
type ApprovalParams = ToolRunnerHandleParams & {
  runId: string | undefined;
  toolMessageId: string;
  reason: string;
  nextStep?: string;
  args: Record<string, unknown>;
  preview?: Record<string, unknown>;
};
type ApprovalRequestedInput = {
  runtime: ToolRunnerRuntime;
  params: ApprovalParams;
  approvalId: string | undefined;
  approval: ToolApprovalRequest | undefined;
};
type ApprovalResolvedInput = {
  runtime: ToolRunnerRuntime;
  params: Omit<ApprovalParams, 'preview'>;
  approvalId: string | undefined;
  approval: ToolApprovalRequest | undefined;
  decision: ToolApprovalDecision;
};
