import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { sanitizeMemoryNote } from '../../entities/memory/memory';
import { safeMkdir, workspaceRunsDir } from '../../entities/storage/storage';
import { assertRepositoryId } from '../../shared/lib/fileRepository';
import { createToolError } from '../../shared/lib/toolErrors';
import type {
  ApprovalDecisionAction,
  ApprovalPreviewFile,
  ApprovalPreviewKind,
  ApprovalPreviewPayload,
  ApprovalResolveRequest,
  ApprovalStatus,
  RuntimeArtifactRef,
  RuntimeClientCapabilities,
  RuntimeEvent,
  RuntimeToolCallSnapshot,
  RuntimeToolResult,
  ToolApprovalDecision,
  ToolApprovalRequest,
  ToolExecutionRequirement
} from '../../shared/types/types';
import type { NodeFilesystemToolContext } from '../../tools/fs/shared/nodeFilesystemToolContext';
import { readTextFileIfExists } from '../../tools/fs/shared/readTextFileIfExists';
import { resolveWorkspacePath } from '../../tools/fs/shared/resolveWorkspacePath';
import { getChangedLineRange } from '../../tools/shared/getChangedLineRange';
import { requireString } from '../../tools/shared/requireString';

export type NormalizedToolApprovalDecision = ToolApprovalDecision & {
  action: ApprovalDecisionAction;
};

export type ToolApprovalResolution = {
  approval: ToolApprovalRequest;
  decision: NormalizedToolApprovalDecision;
  approved: boolean;
  status: ApprovalStatus;
  stopRun: boolean;
  modelResult?: RuntimeToolResult;
};

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

export type PrepareFilesystemToolApprovalInput = Omit<
  CreateToolApprovalRequestInput,
  'previewKind' | 'previewPayload' | 'createdAt'
> & {
  workspaceRoot: string;
  workspaceName?: string;
  activeFile?: string | null;
  activeLanguage?: string | null;
  clientCapabilities?: RuntimeClientCapabilities;
  createdAt?: number;
  writeHeadlessArtifact?: boolean;
};

type ProposedFilesystemEdit = {
  path: string;
  oldContent: string | undefined;
  proposedContent: string;
  created: boolean;
  replacements?: number;
  generatedReplacements?: number;
  instructions?: string;
  strategyUsed?: string;
  diagnostics?: unknown[];
};

type FilesystemEditProposal = {
  files: ProposedFilesystemEdit[];
  patch?: string;
  instructions?: string;
  strategyUsed?: string;
  diagnostics?: unknown[];
};

const AUTO_EXECUTABLE_TOOLS = new Set(['list_files', 'read_file', 'grep_search', 'set_plan_item_status', 'run_skill']);

const UI_ASSISTED_PREVIEW_TOOLS = new Set(['write_file', 'replace_in_file']);

export function getToolExecutionRequirement(
  toolName: string,
  clientCapabilities: RuntimeClientCapabilities = {}
): ToolExecutionRequirement {
  if (AUTO_EXECUTABLE_TOOLS.has(toolName)) {
    return { mode: 'auto' };
  }

  if (UI_ASSISTED_PREVIEW_TOOLS.has(toolName)) {
    return clientCapabilities.vscodeEditableDiffPreview
      ? { mode: 'ui-assisted-preview', previewKind: 'vscode-editable-diff' }
      : { mode: 'approval', previewKind: 'headless-diff-artifact' };
  }

  return { mode: 'approval', previewKind: 'none' };
}

export function isUiAssistedPreviewTool(toolName: string): boolean {
  return UI_ASSISTED_PREVIEW_TOOLS.has(toolName);
}

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

export function resolveToolApproval(
  approval: ToolApprovalRequest,
  input: ToolApprovalDecision | ApprovalResolveRequest,
  now: number = Date.now()
): ToolApprovalResolution {
  if (approval.status !== 'pending') {
    throw createToolError('INVALID_ARGUMENT', `Approval ${approval.approvalId} is already ${approval.status}.`, {
      approvalId: approval.approvalId,
      status: approval.status
    });
  }

  const decision = normalizeToolApprovalDecision(input);
  const status: ApprovalStatus = decision.approved ? 'approved' : 'denied';
  const nextApproval = removeUndefinedValues({
    ...approval,
    status,
    updatedAt: now
  }) as ToolApprovalRequest;

  return removeUndefinedValues({
    approval: nextApproval,
    decision,
    approved: decision.approved,
    status,
    stopRun: decision.action === 'deny-stop',
    modelResult: decision.approved ? undefined : createDeniedToolModelResult(approval, decision)
  }) as ToolApprovalResolution;
}

export function normalizeToolApprovalDecision(
  input: ToolApprovalDecision | ApprovalResolveRequest
): NormalizedToolApprovalDecision {
  const action = getDecisionAction(input);
  const comment = sanitizeApprovalText(input.comment);
  const rememberGlobal = sanitizeApprovalText(input.rememberGlobal);
  const rememberProject = sanitizeApprovalText(input.rememberProject);

  return removeUndefinedValues({
    action,
    approved: action === 'approve',
    continueAfterDeny: action === 'deny-continue',
    comment,
    rememberGlobal,
    rememberProject,
    previewResult: input.previewResult
  }) as NormalizedToolApprovalDecision;
}

export function sanitizeApprovalText(input: unknown): string | undefined {
  return typeof input === 'string' ? sanitizeMemoryNote(input) : undefined;
}

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

export function createApprovalRequestedEvent(input: {
  chatId: string;
  messageId: string;
  approval: ToolApprovalRequest;
  at?: number;
  toolCall?: RuntimeToolCallSnapshot;
}): RuntimeEvent {
  const toolCall =
    input.toolCall ||
    ({
      id: input.approval.toolCallId,
      name: input.approval.toolName,
      args: input.approval.args,
      reason: input.approval.reason
    } satisfies RuntimeToolCallSnapshot);

  return removeUndefinedValues({
    type: 'tool.call.approvalRequested',
    runId: input.approval.runId,
    chatId: input.chatId,
    approvalId: input.approval.approvalId,
    messageId: input.messageId,
    approval: input.approval,
    toolCall,
    preview: input.approval.previewPayload
      ? ({ previewKind: input.approval.previewKind, ...input.approval.previewPayload } as RuntimeToolResult)
      : undefined,
    at: input.at || Date.now()
  }) as RuntimeEvent;
}

export function createApprovalResolvedEvent(input: {
  chatId: string;
  messageId: string;
  resolution: ToolApprovalResolution;
  at?: number;
}): RuntimeEvent {
  return {
    type: 'tool.call.approvalResolved',
    runId: input.resolution.approval.runId,
    chatId: input.chatId,
    approvalId: input.resolution.approval.approvalId,
    messageId: input.messageId,
    approval: input.resolution.approval,
    decision: input.resolution.decision,
    at: input.at || Date.now()
  };
}

function getApprovalPreviewKind(requirement: ToolExecutionRequirement): ApprovalPreviewKind {
  if (requirement.mode === 'ui-assisted-preview') {
    return requirement.previewKind;
  }

  if (requirement.mode === 'approval') {
    return requirement.previewKind || 'none';
  }

  return 'none';
}

async function getFilesystemEditProposal(
  context: NodeFilesystemToolContext,
  toolName: string,
  args: Record<string, unknown>
): Promise<FilesystemEditProposal> {
  switch (toolName) {
    case 'write_file':
      return getWriteFileProposal(context, args);
    case 'replace_in_file':
      return getReplaceInFileProposal(context, args);
    default:
      throw createToolError('INVALID_ARGUMENT', `Tool does not support edit preview: ${toolName}`, { toolName });
  }
}

async function getWriteFileProposal(
  context: NodeFilesystemToolContext,
  args: Record<string, unknown>
): Promise<FilesystemEditProposal> {
  const filePath = requireString({ value: args.path, name: 'path' });
  const proposedContent = requireString({ value: args.content, name: 'content' });
  const resolved = await resolveWorkspacePath({ context, relativePath: filePath, options: { allowMissing: true } });
  const oldContent = await readTextFileIfExists({ filePath: resolved.absolutePath });

  return {
    files: [createProposedEdit(filePath, oldContent, proposedContent)]
  };
}

async function getReplaceInFileProposal(
  context: NodeFilesystemToolContext,
  args: Record<string, unknown>
): Promise<FilesystemEditProposal> {
  const filePath = requireString({ value: args.path, name: 'path' });
  const search = requireString({ value: args.search, name: 'search' });
  const replace = requireString({ value: args.replace, name: 'replace' });
  const replaceAll = Boolean(args.all);
  const resolved = await resolveWorkspacePath({ context, relativePath: filePath, options: { allowMissing: false } });
  const oldContent = await fs.promises.readFile(resolved.absolutePath, 'utf8');

  if (!oldContent.includes(search)) {
    throw createToolError('TEXT_NOT_FOUND', `Text was not found in ${filePath}.`, { path: filePath });
  }

  const proposedContent = replaceAll ? oldContent.split(search).join(replace) : oldContent.replace(search, replace);
  const replacements = replaceAll ? oldContent.split(search).length - 1 : 1;
  return {
    files: [createProposedEdit(filePath, oldContent, proposedContent, { replacements })]
  };
}

function createProposedEdit(
  filePath: string,
  oldContent: string | undefined,
  proposedContent: string,
  extra: Partial<ProposedFilesystemEdit> = {}
): ProposedFilesystemEdit {
  return {
    path: filePath,
    oldContent,
    proposedContent,
    created: oldContent === undefined,
    ...extra
  };
}

function toApprovalPreviewFile(file: ProposedFilesystemEdit, includeContents: boolean): ApprovalPreviewFile {
  return removeUndefinedValues({
    path: file.path,
    oldContent: includeContents ? file.oldContent : undefined,
    proposedContent: includeContents ? file.proposedContent : undefined,
    created: file.created,
    replacements: file.replacements,
    generatedReplacements: file.generatedReplacements,
    ...getChangedLineRange({ beforeContent: file.oldContent || '', afterContent: file.proposedContent })
  }) as ApprovalPreviewFile;
}

function getApprovedPreviewFiles(
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

function createDeniedToolModelResult(
  approval: ToolApprovalRequest,
  decision: NormalizedToolApprovalDecision
): RuntimeToolResult {
  return removeUndefinedValues({
    ok: false,
    decision: 'denied',
    approvalId: approval.approvalId,
    toolCallId: approval.toolCallId,
    toolName: approval.toolName,
    comment: decision.comment || '',
    continueAfterDeny: decision.continueAfterDeny,
    userApprovalComment: decision.comment
  }) as RuntimeToolResult;
}

function getDecisionAction(input: ToolApprovalDecision | ApprovalResolveRequest): ApprovalDecisionAction {
  if ('decision' in input) {
    return input.decision;
  }

  if (input.action) {
    return input.action;
  }

  if (input.approved) {
    return 'approve';
  }

  return input.continueAfterDeny ? 'deny-continue' : 'deny-stop';
}

function createUnifiedDiffForFiles(files: ProposedFilesystemEdit[]): string {
  return files
    .map((file) => createUnifiedDiff(file.path, file.oldContent, file.proposedContent))
    .filter(Boolean)
    .join('\n');
}

function createUnifiedDiff(filePath: string, oldContent: string | undefined, newContent: string): string {
  const oldLines = splitDiffLines(oldContent || '');
  const newLines = splitDiffLines(newContent);
  if (oldContent !== undefined && oldContent === newContent) {
    return '';
  }

  let prefix = 0;
  while (prefix < oldLines.length && prefix < newLines.length && oldLines[prefix] === newLines[prefix]) {
    prefix += 1;
  }

  let oldSuffix = oldLines.length - 1;
  let newSuffix = newLines.length - 1;
  while (oldSuffix >= prefix && newSuffix >= prefix && oldLines[oldSuffix] === newLines[newSuffix]) {
    oldSuffix -= 1;
    newSuffix -= 1;
  }

  const oldChunk = oldLines.slice(prefix, oldSuffix + 1);
  const newChunk = newLines.slice(prefix, newSuffix + 1);
  const oldStart = oldChunk.length ? prefix + 1 : 0;
  const newStart = newChunk.length ? prefix + 1 : 0;
  const header = [`--- ${oldContent === undefined ? '/dev/null' : `a/${filePath}`}`, `+++ b/${filePath}`];
  const hunk = [`@@ -${oldStart},${oldChunk.length} +${newStart},${newChunk.length} @@`];

  return [...header, ...hunk, ...oldChunk.map((line) => `-${line}`), ...newChunk.map((line) => `+${line}`), ''].join(
    '\n'
  );
}

function splitDiffLines(content: string): string[] {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.at(-1) === '') {
    lines.pop();
  }
  return lines;
}

function normalizeOptionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function toJsonObject(value: Record<string, unknown>): Record<string, unknown> {
  try {
    const parsed = JSON.parse(JSON.stringify(value || {})) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch (error) {
    throw createToolError('INVALID_ARGUMENT', 'Approval arguments must be JSON-serializable.', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

function toJsonArray(value: unknown[] | undefined): unknown[] | undefined {
  if (!value?.length) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as unknown[];
}

function removeUndefinedValues<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
