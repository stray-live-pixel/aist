import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';

import { safeMkdir, workspaceRunsDir } from '../../../entities/storage/storage';
import { assertRepositoryId } from '../../../shared/lib/fileRepository';
import { type RuntimeArtifactRef } from '../../../shared/types/types';

export async function writeHeadlessApprovalDiffArtifact(input: {
  workspaceRoot: string;
  runId: string;
  approvalId: string;
  diff: string;
}): Promise<RuntimeArtifactRef> {
  const safeRunId = assertRepositoryId(input.runId, 'run');
  const safeApprovalId = assertRepositoryId(input.approvalId, 'approval');
  const relativePath = path.posix.join(
    '.aist-agent',
    'runs',
    safeRunId,
    'artifacts',
    'approvals',
    `${safeApprovalId}.diff`
  );
  const absolutePath = path.join(
    workspaceRunsDir(input.workspaceRoot),
    safeRunId,
    'artifacts',
    'approvals',
    `${safeApprovalId}.diff`
  );

  await safeMkdir(path.dirname(absolutePath));
  await fs.promises.writeFile(absolutePath, input.diff, 'utf8');

  return {
    path: relativePath,
    absolutePath,
    bytes: Buffer.byteLength(input.diff, 'utf8'),
    mimeType: 'text/x-diff',
    description: 'Proposed tool edit diff for headless approval.'
  };
}
