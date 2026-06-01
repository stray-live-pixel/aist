import path from 'node:path';

import { createToolError } from '../../../shared/lib/toolErrors';
import { type ToolApprovalRequest } from '../../../shared/types/types';
import { NormalizedToolApprovalDecision } from './NormalizedToolApprovalDecision';

export function getApprovedPreviewFiles(
  approval: ToolApprovalRequest,
  decision: NormalizedToolApprovalDecision
): Array<{ path: string; content: string }> {
  const previewResult = decision.previewResult;
  if (previewResult?.kind === 'file-content') {
    const pathFromResult = typeof previewResult.path === 'string' ? previewResult.path : undefined;
    const pathFromPayload = approval.previewPayload?.files?.[0]?.path;
    const content = typeof previewResult.content === 'string' ? previewResult.content : undefined;
    if (content === undefined) {
      throw createToolError('INVALID_ARGUMENT', 'Approved file-content preview result must include content.', {
        approvalId: approval.approvalId
      });
    }

    return [{ path: pathFromResult || pathFromPayload || '', content }].filter((file) => Boolean(file.path));
  }

  if (previewResult?.kind === 'multi-file-content') {
    return (previewResult.files || []).map((file) => ({ path: file.path, content: file.content }));
  }

  return (approval.previewPayload?.files || [])
    .filter((file) => typeof file.proposedContent === 'string')
    .map((file) => ({ path: file.path, content: String(file.proposedContent) }));
}
