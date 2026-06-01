import { type ApprovalPreviewKind, type ApprovalPreviewPayload } from '../../../shared/types/types';

export type CreateToolApprovalRequestInput = {
  approvalId?: string;
  runId: string;
  toolCallId: string;
  toolName: string;
  reason?: string;
  args: Record<string, unknown>;
  previewKind?: ApprovalPreviewKind;
  previewPayload?: ApprovalPreviewPayload;
  chatId?: string;
  messageId?: string;
  createdAt?: number;
  idFactory?: () => string;
};
