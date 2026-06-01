import { type ApprovalDecisionAction, type ToolApprovalDecision } from '../../../shared/types/types';

export type NormalizedToolApprovalDecision = ToolApprovalDecision & {
  action: ApprovalDecisionAction;
};
