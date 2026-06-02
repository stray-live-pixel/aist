import { type RuntimeEvent } from '../../../shared/types/types';
import { ToolApprovalResolution } from './ToolApprovalResolution';

export function createApprovalResolvedEvent(input: {
  chatId: string;
  messageId: string;
  resolution: ToolApprovalResolution;
  at?: number;
}): RuntimeEvent {
  return {
    type: 'tool.call.approvalResolved',
    runId: input.resolution.approval.runId,
    chatId: input.chatId,
    approvalId: input.resolution.approval.approvalId,
    messageId: input.messageId,
    approval: input.resolution.approval,
    decision: input.resolution.decision,
    at: input.at || Date.now()
  };
}
