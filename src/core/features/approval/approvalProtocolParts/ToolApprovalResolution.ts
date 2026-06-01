import { type ApprovalStatus, type RuntimeToolResult, type ToolApprovalRequest } from '../../../shared/types/types';
import { NormalizedToolApprovalDecision } from './NormalizedToolApprovalDecision';

export type ToolApprovalResolution = {
  approval: ToolApprovalRequest;
  decision: NormalizedToolApprovalDecision;
  approved: boolean;
  status: ApprovalStatus;
  stopRun: boolean;
  modelResult?: RuntimeToolResult;
};
