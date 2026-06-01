import type { ToolApprovalDecision } from '../../../core/shared/types/types';
import type { WebviewMessage } from '../types';

/**
 * Что это: переводит webview resolveToolCall message в daemon approval decision.
 * Зачем нужно: UI-строки approve/deny-continue должны стать типизированным решением runtime.
 * Какую продуктовую проблему решает: daemon получает все поля remember/comment в одном безопасном формате.
 */
export function toToolApprovalDecision({
  message
}: {
  message: Extract<WebviewMessage, { type: 'resolveToolCall' }>;
}): ToolApprovalDecision {
  return {
    approved: message.decision === 'approve',
    continueAfterDeny: message.decision === 'deny-continue',
    comment: message.comment?.trim() || undefined,
    rememberGlobal: message.rememberGlobal?.trim() || undefined,
    rememberProject: message.rememberProject?.trim() || undefined
  };
}
