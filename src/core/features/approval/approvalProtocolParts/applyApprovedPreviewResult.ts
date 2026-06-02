import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';

import { createToolError } from '../../../shared/lib/toolErrors';
import {
  type ApprovalResolveRequest,
  type RuntimeToolResult,
  type ToolApprovalDecision,
  type ToolApprovalRequest
} from '../../../shared/types/types';
import { type NodeFilesystemToolContext } from '../../../tools/fs/shared/nodeFilesystemToolContext';
import { readTextFileIfExists } from '../../../tools/fs/shared/readTextFileIfExists';
import { resolveWorkspacePath } from '../../../tools/fs/shared/resolveWorkspacePath';
import { getChangedLineRange } from '../../../tools/shared/getChangedLineRange';
import { getApprovedPreviewFiles } from './getApprovedPreviewFiles';
import { normalizeToolApprovalDecision } from './normalizeToolApprovalDecision';
import { removeUndefinedValues } from './removeUndefinedValues';

export async function applyApprovedPreviewResult(input: {
  workspaceRoot: string;
  approval: ToolApprovalRequest;
  decision: ToolApprovalDecision | ApprovalResolveRequest;
}): Promise<RuntimeToolResult> {
  const decision = normalizeToolApprovalDecision(input.decision);
  if (!decision.approved) {
    throw createToolError('INVALID_ARGUMENT', 'Denied approvals cannot apply preview content.', {
      approvalId: input.approval.approvalId
    });
  }

  if (decision.previewResult?.kind === 'tool-result') {
    return decision.previewResult.result || { ok: true };
  }

  const files = getApprovedPreviewFiles(input.approval, decision);
  if (!files.length) {
    return decision.previewResult?.result || { ok: true };
  }

  const summaries: RuntimeToolResult[] = [];
  const context: NodeFilesystemToolContext = { workspaceRoot: input.workspaceRoot };
  for (const file of files) {
    const resolved = await resolveWorkspacePath({ context, relativePath: file.path, options: { allowMissing: true } });
    const oldContent = await readTextFileIfExists({ filePath: resolved.absolutePath });
    await fs.promises.mkdir(path.dirname(resolved.absolutePath), { recursive: true });
    await fs.promises.writeFile(resolved.absolutePath, file.content, 'utf8');
    summaries.push({
      ok: true,
      path: file.path,
      bytes: Buffer.byteLength(file.content, 'utf8'),
      created: oldContent === undefined,
      ...getChangedLineRange({ beforeContent: oldContent || '', afterContent: file.content })
    });
  }

  if (decision.previewResult?.result) {
    return decision.previewResult.result;
  }

  const first = summaries[0] || {};
  return removeUndefinedValues({
    ok: true,
    ...(summaries.length === 1 ? first : {}),
    files: summaries,
    changedFiles: summaries
  }) as RuntimeToolResult;
}
