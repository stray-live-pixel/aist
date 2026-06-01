import {
  type ApprovalDecisionAction,
  type ApprovalResolveRequest,
  type ToolApprovalDecision
} from '../../../shared/types/types';

export function getDecisionAction(input: ToolApprovalDecision | ApprovalResolveRequest): ApprovalDecisionAction {
  if ('decision' in input) {
    return input.decision;
  }

  if (input.action) {
    return input.action;
  }

  if (input.approved) {
    return 'approve';
  }

  return input.continueAfterDeny ? 'deny-continue' : 'deny-stop';
}
