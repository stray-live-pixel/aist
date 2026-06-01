import {
  type RuntimeEvent,
  type RuntimeToolCallSnapshot,
  type RuntimeToolResult,
  type ToolApprovalRequest
} from '../../../shared/types/types';
import { removeUndefinedValues } from './removeUndefinedValues';

export function createApprovalRequestedEvent(input: {
  chatId: string;
  messageId: string;
  approval: ToolApprovalRequest;
  at?: number;
  toolCall?: RuntimeToolCallSnapshot;
}): RuntimeEvent {
  const toolCall =
    input.toolCall ||
    ({
      id: input.approval.toolCallId,
      name: input.approval.toolName,
      args: input.approval.args,
      reason: input.approval.reason
    } satisfies RuntimeToolCallSnapshot);

  return removeUndefinedValues({
    type: 'tool.call.approvalRequested',
    runId: input.approval.runId,
    chatId: input.chatId,
    approvalId: input.approval.approvalId,
    messageId: input.messageId,
    approval: input.approval,
    toolCall,
    preview: input.approval.previewPayload
      ? ({ previewKind: input.approval.previewKind, ...input.approval.previewPayload } as RuntimeToolResult)
      : undefined,
    at: input.at || Date.now()
  }) as RuntimeEvent;
}
