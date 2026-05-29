import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  applyApprovedPreviewResult,
  createApprovalRequestedEvent,
  createToolApprovalRequest,
  getToolExecutionRequirement,
  prepareFilesystemToolApprovalRequest,
  resolveToolApproval
} from './approvalProtocol';

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aist-approval-protocol-'));
});

afterEach(() => {
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
});

describe('approval protocol contracts', () => {
  it('classifies auto, approval and UI-assisted preview tools', () => {
    expect(getToolExecutionRequirement('read_file')).toEqual({ mode: 'auto' });
    expect(getToolExecutionRequirement('run_skill')).toEqual({ mode: 'auto' });
    expect(getToolExecutionRequirement('run_bash_script')).toEqual({ mode: 'approval', previewKind: 'none' });
    expect(getToolExecutionRequirement('unknown_tool')).toEqual({ mode: 'approval', previewKind: 'none' });
  });

  it('moves pending approvals to approved and rejects double resolution', () => {
    const approval = createToolApprovalRequest({
      approvalId: 'approval-1',
      runId: 'run-1',
      toolCallId: 'call-1',
      toolName: 'run_bash_script',
      reason: 'Run focused tests',
      args: { reason: 'verify', script: 'npm test' },
      createdAt: 100
    });

    const resolution = resolveToolApproval(approval, { decision: 'approve', comment: '  Looks safe. ' }, 200);

    expect(resolution).toMatchObject({
      approved: true,
      status: 'approved',
      stopRun: false,
      approval: { status: 'approved', updatedAt: 200 },
      decision: { action: 'approve', approved: true, continueAfterDeny: false, comment: 'Looks safe.' }
    });
    expect(() => resolveToolApproval(resolution.approval, { decision: 'deny-stop' })).toThrow(
      'Approval approval-1 is already approved.'
    );
  });

  it('returns a model-visible denial result for deny-continue', () => {
    const approval = createToolApprovalRequest({
      approvalId: 'approval-2',
      runId: 'run-1',
      toolCallId: 'call-2',
      toolName: 'write_file',
      args: { reason: 'edit', path: 'src/a.ts', content: 'next' },
      createdAt: 100
    });

    const resolution = resolveToolApproval(approval, {
      decision: 'deny-continue',
      comment: '  Use a smaller edit. ',
      rememberGlobal: 'apiKey: secret-value'
    });

    expect(resolution.stopRun).toBe(false);
    expect(resolution.approval.status).toBe('denied');
    expect(resolution.decision.rememberGlobal).toBeUndefined();
    expect(resolution.modelResult).toEqual({
      ok: false,
      decision: 'denied',
      approvalId: 'approval-2',
      toolCallId: 'call-2',
      toolName: 'write_file',
      comment: 'Use a smaller edit.',
      continueAfterDeny: true,
      userApprovalComment: 'Use a smaller edit.'
    });
  });

  it('marks deny-stop as a run-stopping denial', () => {
    const approval = createToolApprovalRequest({
      approvalId: 'approval-3',
      runId: 'run-1',
      toolCallId: 'call-3',
      toolName: 'delete_path',
      args: { reason: 'cleanup', path: 'dist', recursive: true },
      createdAt: 100
    });

    const resolution = resolveToolApproval(approval, { decision: 'deny-stop', comment: 'Stop here.' });

    expect(resolution).toMatchObject({
      approved: false,
      status: 'denied',
      stopRun: true,
      modelResult: {
        ok: false,
        decision: 'denied',
        continueAfterDeny: false,
        userApprovalComment: 'Stop here.'
      }
    });
  });

  it('creates a VS Code editable diff approval request without applying the proposed edit', async () => {
    writeWorkspaceFile('src/example.ts', 'old\n');

    const approval = await prepareFilesystemToolApprovalRequest({
      approvalId: 'approval-4',
      runId: 'run-1',
      toolCallId: 'call-4',
      toolName: 'write_file',
      reason: 'Update example',
      args: { reason: 'edit', path: 'src/example.ts', content: 'model proposal\n' },
      workspaceRoot,
      clientCapabilities: { vscodeEditableDiffPreview: true },
      createdAt: 100
    });

    expect(readWorkspaceFile('src/example.ts')).toBe('old\n');
    expect(approval).toMatchObject({
      approvalId: 'approval-4',
      runId: 'run-1',
      toolCallId: 'call-4',
      toolName: 'write_file',
      previewKind: 'vscode-editable-diff',
      status: 'pending',
      previewPayload: {
        files: [
          expect.objectContaining({
            path: 'src/example.ts',
            oldContent: 'old\n',
            proposedContent: 'model proposal\n'
          })
        ]
      }
    });

    const event = createApprovalRequestedEvent({ chatId: 'chat-1', messageId: 'message-1', approval, at: 120 });
    expect(JSON.parse(JSON.stringify(event))).toMatchObject({
      type: 'tool.call.approvalRequested',
      approvalId: 'approval-4',
      approval: { previewKind: 'vscode-editable-diff' }
    });
  });

  it('writes a headless diff artifact fallback for file edits', async () => {
    writeWorkspaceFile('src/example.ts', 'old\n');

    const approval = await prepareFilesystemToolApprovalRequest({
      approvalId: 'approval-5',
      runId: 'run-1',
      toolCallId: 'call-5',
      toolName: 'replace_in_file',
      reason: 'Update example',
      args: { reason: 'edit', path: 'src/example.ts', search: 'old', replace: 'new' },
      workspaceRoot,
      createdAt: 100
    });

    const artifact = approval.previewPayload?.artifact;
    expect(approval.previewKind).toBe('headless-diff-artifact');
    expect(approval.previewPayload?.files?.[0]).toMatchObject({ path: 'src/example.ts' });
    expect(approval.previewPayload?.files?.[0]).not.toHaveProperty('oldContent');
    expect(approval.previewPayload?.files?.[0]).not.toHaveProperty('proposedContent');
    expect(typeof artifact?.absolutePath).toBe('string');
    expect(fs.readFileSync(String(artifact?.absolutePath), 'utf8')).toContain('-old');
    expect(fs.readFileSync(String(artifact?.absolutePath), 'utf8')).toContain('+new');
    expect(readWorkspaceFile('src/example.ts')).toBe('old\n');
  });

  it('applies final approved preview content as the source of truth', async () => {
    writeWorkspaceFile('src/example.ts', 'old\n');
    const approval = createToolApprovalRequest({
      approvalId: 'approval-6',
      runId: 'run-1',
      toolCallId: 'call-6',
      toolName: 'write_file',
      args: { reason: 'edit', path: 'src/example.ts', content: 'model proposal\n' },
      previewKind: 'vscode-editable-diff',
      previewPayload: {
        files: [{ path: 'src/example.ts', oldContent: 'old\n', proposedContent: 'model proposal\n' }]
      },
      createdAt: 100
    });

    const result = await applyApprovedPreviewResult({
      workspaceRoot,
      approval,
      decision: {
        decision: 'approve',
        previewResult: {
          kind: 'file-content',
          path: 'src/example.ts',
          content: 'user edited final content\n'
        }
      }
    });

    expect(readWorkspaceFile('src/example.ts')).toBe('user edited final content\n');
    expect(result).toMatchObject({
      ok: true,
      path: 'src/example.ts',
      files: [expect.objectContaining({ path: 'src/example.ts' })]
    });
  });
});

function writeWorkspaceFile(relativePath: string, content: string): void {
  const filePath = path.join(workspaceRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}
