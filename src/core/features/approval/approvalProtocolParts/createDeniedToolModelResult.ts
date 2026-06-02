import { type RuntimeToolResult, type ToolApprovalRequest } from '../../../shared/types/types';
import { NormalizedToolApprovalDecision } from './NormalizedToolApprovalDecision';
import { removeUndefinedValues } from './removeUndefinedValues';

export function createDeniedToolModelResult(
  approval: ToolApprovalRequest,
  decision: NormalizedToolApprovalDecision
): RuntimeToolResult {
  return removeUndefinedValues({
    ok: false,
    decision: 'denied',
    approvalId: approval.approvalId,
    toolCallId: approval.toolCallId,
    toolName: approval.toolName,
    comment: decision.comment || '',
    continueAfterDeny: decision.continueAfterDeny,
    userApprovalComment: decision.comment
  }) as RuntimeToolResult;
}
