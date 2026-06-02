import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { type ApprovalPreviewPayload, type ToolApprovalRequest } from '../../../shared/types/types';
import { type NodeFilesystemToolContext } from '../../../tools/fs/shared/nodeFilesystemToolContext';
import { PrepareFilesystemToolApprovalInput } from './PrepareFilesystemToolApprovalInput';
import { createToolApprovalRequest } from './createToolApprovalRequest';
import { createUnifiedDiffForFiles } from './createUnifiedDiffForFiles';
import { getApprovalPreviewKind } from './getApprovalPreviewKind';
import { getFilesystemEditProposal } from './getFilesystemEditProposal';
import { getToolExecutionRequirement } from './getToolExecutionRequirement';
import { isUiAssistedPreviewTool } from './isUiAssistedPreviewTool';
import { removeUndefinedValues } from './removeUndefinedValues';
import { toApprovalPreviewFile } from './toApprovalPreviewFile';
import { toJsonArray } from './toJsonArray';
import { writeHeadlessApprovalDiffArtifact } from './writeHeadlessApprovalDiffArtifact';

export async function prepareFilesystemToolApprovalRequest(
  input: PrepareFilesystemToolApprovalInput
): Promise<ToolApprovalRequest> {
  const requirement = getToolExecutionRequirement(input.toolName, input.clientCapabilities);
  const previewKind = getApprovalPreviewKind(requirement);

  if (!isUiAssistedPreviewTool(input.toolName)) {
    return createToolApprovalRequest({
      ...input,
      previewKind,
      previewPayload: undefined
    });
  }

  const context: NodeFilesystemToolContext = {
    workspaceRoot: input.workspaceRoot,
    workspaceName: input.workspaceName,
    activeFile: input.activeFile,
    activeLanguage: input.activeLanguage
  };
  const proposal = await getFilesystemEditProposal(context, input.toolName, input.args);
  const diff = proposal.patch || createUnifiedDiffForFiles(proposal.files);
  const includeContents = previewKind === 'vscode-editable-diff';
  const previewPayload: ApprovalPreviewPayload = removeUndefinedValues({
    files: proposal.files.map((file) => toApprovalPreviewFile(file, includeContents)),
    patch: includeContents ? diff : undefined,
    instructions: proposal.instructions,
    strategyUsed: proposal.strategyUsed,
    diagnostics: toJsonArray(proposal.diagnostics)
  }) as ApprovalPreviewPayload;

  if (previewKind === 'headless-diff-artifact' && input.writeHeadlessArtifact !== false) {
    previewPayload.artifact = await writeHeadlessApprovalDiffArtifact({
      workspaceRoot: input.workspaceRoot,
      runId: input.runId,
      approvalId: input.approvalId || input.idFactory?.() || randomUUID(),
      diff
    });
  }

  return createToolApprovalRequest({
    ...input,
    approvalId: previewPayload.artifact
      ? path.posix.basename(String(previewPayload.artifact.path), '.diff')
      : input.approvalId,
    previewKind,
    previewPayload
  });
}
