import type { NormalizedToolApprovalDecision } from '../../approval/approvalProtocol';
import { buildModelToolResult } from '../toolResultCompaction';
import type { ToolRunnerRuntime } from './ToolRunnerRuntime';
import { emitToolCompleted } from './events';
import { persistToolResult } from './persistToolResult';
import type { ToolRunnerHandleParams } from './types';

/**
 * Что это: записывает denial result в chat, model history и run timeline.
 * Зачем нужно: отказ пользователя — это валидный результат tool-call, а не техническая ошибка.
 * Какую продуктовую проблему решает: агент видит комментарий deny и может продолжить/остановиться по решению пользователя.
 */
export async function denyToolCall({ runtime, params, decision }: DenyToolCallInput): Promise<void> {
  const result = buildDenialResult({ decision });
  const uiResult = params.preview ? { preview: params.preview, result } : result;
  const modelResult = buildModelToolResult(params.toolCall.function.name, params.args, uiResult);

  await runtime.deps.context.updateToolMessage(params.chat.id, params.toolMessageId, {
    status: 'denied',
    approval: 'denied',
    reason: params.reason,
    nextStep: params.nextStep,
    args: params.args,
    result: uiResult,
    modelResult,
    userApprovalComment: decision.comment
  });
  params.workingMessages.push({ role: 'tool', tool_call_id: params.toolCall.id, content: JSON.stringify(modelResult) });
  await persistToolResult({
    runtime,
    params,
    runId: params.runId,
    messageId: params.toolMessageId,
    args: params.args,
    reason: params.reason,
    nextStep: params.nextStep,
    result: uiResult,
    modelResult
  });
  await emitToolCompleted({
    runtime,
    params,
    runId: params.runId,
    messageId: params.toolMessageId,
    args: params.args,
    reason: params.reason,
    nextStep: params.nextStep,
    result: uiResult,
    modelResult
  });
  runtime.deps.context.sendState?.();
}

/** Что это: формирует JSON result отказа; зачем нужно: UI/model видят comment и continueAfterDeny; проблема: deny не теряет причину пользователя. */
function buildDenialResult({ decision }: { decision: NormalizedToolApprovalDecision }): Record<string, unknown> {
  const result: Record<string, unknown> = {
    ok: false,
    decision: 'denied',
    comment: decision.comment || '',
    continueAfterDeny: decision.continueAfterDeny
  };
  if (decision.comment) result.userApprovalComment = decision.comment;
  return result;
}

type ApprovalParams = ToolRunnerHandleParams & {
  runId: string | undefined;
  toolMessageId: string;
  reason: string;
  nextStep?: string;
  args: Record<string, unknown>;
  preview: Record<string, unknown> | undefined;
};
type DenyToolCallInput = {
  runtime: ToolRunnerRuntime;
  params: ApprovalParams;
  decision: NormalizedToolApprovalDecision;
};
