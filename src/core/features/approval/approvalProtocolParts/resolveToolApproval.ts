import { createToolError } from '../../../shared/lib/toolErrors';
import {
  type ApprovalResolveRequest,
  type ApprovalStatus,
  type ToolApprovalDecision,
  type ToolApprovalRequest
} from '../../../shared/types/types';
import { ToolApprovalResolution } from './ToolApprovalResolution';
import { createDeniedToolModelResult } from './createDeniedToolModelResult';
import { normalizeToolApprovalDecision } from './normalizeToolApprovalDecision';
import { removeUndefinedValues } from './removeUndefinedValues';

export function resolveToolApproval(
  approval: ToolApprovalRequest,
  input: ToolApprovalDecision | ApprovalResolveRequest,
  now: number = Date.now()
): ToolApprovalResolution {
  if (approval.status !== 'pending') {
    throw createToolError('INVALID_ARGUMENT', `Approval ${approval.approvalId} is already ${approval.status}.`, {
      approvalId: approval.approvalId,
      status: approval.status
    });
  }

  const decision = normalizeToolApprovalDecision(input);
  const status: ApprovalStatus = decision.approved ? 'approved' : 'denied';
  const nextApproval = removeUndefinedValues({
    ...approval,
    status,
    updatedAt: now
  }) as ToolApprovalRequest;

  return removeUndefinedValues({
    approval: nextApproval,
    decision,
    approved: decision.approved,
    status,
    stopRun: decision.action === 'deny-stop',
    modelResult: decision.approved ? undefined : createDeniedToolModelResult(approval, decision)
  }) as ToolApprovalResolution;
}
