import { type ApprovalResolveRequest, type ToolApprovalDecision } from '../../../shared/types/types';
import { NormalizedToolApprovalDecision } from './NormalizedToolApprovalDecision';
import { getDecisionAction } from './getDecisionAction';
import { removeUndefinedValues } from './removeUndefinedValues';
import { sanitizeApprovalText } from './sanitizeApprovalText';

export function normalizeToolApprovalDecision(
  input: ToolApprovalDecision | ApprovalResolveRequest
): NormalizedToolApprovalDecision {
  const action = getDecisionAction(input);
  const comment = sanitizeApprovalText(input.comment);
  const rememberGlobal = sanitizeApprovalText(input.rememberGlobal);
  const rememberProject = sanitizeApprovalText(input.rememberProject);

  return removeUndefinedValues({
    action,
    approved: action === 'approve',
    continueAfterDeny: action === 'deny-continue',
    comment,
    rememberGlobal,
    rememberProject,
    previewResult: input.previewResult
  }) as NormalizedToolApprovalDecision;
}
