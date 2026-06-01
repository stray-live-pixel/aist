import type { ApprovalResolveRequest } from '../../core/shared/types/types';

export type DaemonApprovalResolveParams = ApprovalResolveRequest & {
  readonly approvalId?: string;
  readonly messageId?: string;
};

export type DaemonApprovalResolveResult = {
  readonly operationId: string;
  readonly resolved: boolean;
  readonly approvalId?: string;
  readonly messageId?: string;
};
