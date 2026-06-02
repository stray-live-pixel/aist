import { randomUUID } from 'node:crypto';

import { assertRepositoryId } from '../../../shared/lib/fileRepository';
import { type ToolApprovalRequest } from '../../../shared/types/types';
import { CreateToolApprovalRequestInput } from './CreateToolApprovalRequestInput';
import { normalizeOptionalText } from './normalizeOptionalText';
import { removeUndefinedValues } from './removeUndefinedValues';
import { toJsonObject } from './toJsonObject';

export function createToolApprovalRequest(input: CreateToolApprovalRequestInput): ToolApprovalRequest {
  const approvalId = assertRepositoryId(input.approvalId || input.idFactory?.() || randomUUID(), 'approval');

  return removeUndefinedValues({
    approvalId,
    runId: assertRepositoryId(input.runId, 'run'),
    toolCallId: input.toolCallId,
    toolName: input.toolName,
    reason: normalizeOptionalText(input.reason),
    args: toJsonObject(input.args),
    previewKind: input.previewKind || 'none',
    previewPayload: input.previewPayload,
    status: 'pending',
    createdAt: input.createdAt || Date.now(),
    chatId: input.chatId,
    messageId: input.messageId
  }) as ToolApprovalRequest;
}
