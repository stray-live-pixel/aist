import { Buffer } from 'node:buffer';
import { TextDecoder } from 'node:util';
import * as vscode from 'vscode';

import { createToolError } from '../../core/shared/lib/toolErrors';
import type { ToolApprovalRequest } from '../../core/shared/types/types';
import type { AppliedPatch } from '../../core/tools/applyPatch';
import { applyUnifiedPatchToContents, parseUnifiedPatch } from '../../core/tools/applyPatch';
import type { SemanticEditPlan } from '../../core/tools/semanticEdit';
import { changedRangesFromLineRange, selectSemanticEdit } from '../../core/tools/semanticEdit';
import { resolveWorkspacePath } from '../shared/workspace';
import { type EditableDiffPreview, showEditableFileDiff } from './editableDiffPreview';

const textDecoder = new TextDecoder('utf-8');

export type FilesystemToolPreview = EditableDiffPreview;

export async function previewFilesystemApprovalRequest(
  request: ToolApprovalRequest
): Promise<FilesystemToolPreview | undefined> {
  if (request.previewKind !== 'vscode-editable-diff') {
    return undefined;
  }

  return previewFilesystemTool(request.toolName, request.args);
}

export async function previewFilesystemTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<FilesystemToolPreview | undefined> {
  if (toolName === 'write_file') {
    return showFileDiff(requireString(args.path, 'path'), requireString(args.content, 'content'));
  }

  if (toolName === 'replace_in_file') {
    const filePath = requireString(args.path, 'path');
    const search = requireString(args.search, 'search');
    const replace = requireString(args.replace, 'replace');
    const uri = resolveWorkspacePath(filePath);
    const content = textDecoder.decode(await vscode.workspace.fs.readFile(uri));

    if (!content.includes(search)) {
      throw createToolError('TEXT_NOT_FOUND', `Text was not found in ${filePath}.`, { path: filePath });
    }

    const replaceAll = Boolean(args.all);
    const nextContent = replaceAll ? content.split(search).join(replace) : content.replace(search, replace);
    const generatedReplacements = replaceAll ? content.split(search).length - 1 : 1;
    return showFileDiff(filePath, nextContent, generatedReplacements);
  }

  if (toolName === 'edit_file') {
    return showSemanticEditDiff(await getSemanticEditPlan(args));
  }

  if (toolName === 'apply_patch') {
    return showPatchDiff(await getAppliedPatch(requireString(args.patch, 'patch')));
  }

  return undefined;
}

async function showFileDiff(
  filePath: string,
  nextContent: string,
  generatedReplacements?: number
): Promise<FilesystemToolPreview> {
  return showEditableFileDiff({ filePath, nextContent, generatedReplacements });
}

async function showSemanticEditDiff(plan: SemanticEditPlan): Promise<FilesystemToolPreview> {
  const preview = await showFileDiff(plan.path, plan.nextContent, plan.replacements);

  return {
    preview: {
      ...preview.preview,
      instructions: plan.instructions,
      strategyUsed: plan.strategyUsed,
      diagnostics: plan.diagnostics,
      changedRanges: plan.changedRanges
    },
    approve: async () => {
      const result = await preview.approve();
      return createSemanticEditResult(plan, result);
    },
    cleanup: () => preview.cleanup()
  };
}

async function showPatchDiff(appliedPatch: AppliedPatch): Promise<FilesystemToolPreview> {
  const previews: FilesystemToolPreview[] = [];

  try {
    for (const file of appliedPatch.files) {
      previews.push(await showFileDiff(file.path, file.newContent));
    }
  } catch (error) {
    await cleanupPatchPreviews(previews);
    throw error;
  }

  return {
    preview: {
      ok: true,
      diffShown: true,
      editable: true,
      files: appliedPatch.files.map(toPatchFileSummary)
    },
    approve: async () => {
      const files = [];
      for (const preview of previews) {
        files.push(await preview.approve());
      }

      return {
        ok: true,
        files,
        changedFiles: files
      };
    },
    cleanup: () => cleanupPatchPreviews(previews)
  };
}

async function cleanupPatchPreviews(previews: FilesystemToolPreview[]): Promise<void> {
  for (const preview of [...previews].reverse()) {
    await preview.cleanup();
  }
}

async function getAppliedPatch(patch: string): Promise<AppliedPatch> {
  const parsedFiles = parseUnifiedPatch(patch);
  const contentsByPath: Record<string, string | undefined> = {};

  for (const file of parsedFiles) {
    const uri = resolveWorkspacePath(file.path);
    contentsByPath[file.path] = await readFileIfExists(uri);
  }

  return applyUnifiedPatchToContents(patch, contentsByPath);
}

async function getSemanticEditPlan(args: Record<string, unknown>): Promise<SemanticEditPlan> {
  const filePath = requireString(args.path, 'path');
  const uri = resolveWorkspacePath(filePath);
  const content = textDecoder.decode(await vscode.workspace.fs.readFile(uri));
  return selectSemanticEdit(args, content);
}

async function readFileIfExists(uri: vscode.Uri): Promise<string | undefined> {
  try {
    return textDecoder.decode(await vscode.workspace.fs.readFile(uri));
  } catch {
    return undefined;
  }
}

function toPatchFileSummary(file: AppliedPatch['files'][number]): Record<string, unknown> {
  return {
    path: file.path,
    created: file.created,
    bytes: Buffer.byteLength(file.newContent, 'utf8'),
    ...getChangedLineRange(file.oldContent || '', file.newContent)
  };
}

function createSemanticEditResult(plan: SemanticEditPlan, result: Record<string, unknown>): Record<string, unknown> {
  const changedRanges = changedRangesFromLineRange(plan.path, result);

  return {
    ...result,
    instructions: plan.instructions,
    strategyUsed: plan.strategyUsed,
    diagnostics: plan.diagnostics,
    changedRanges: changedRanges.length ? changedRanges : plan.changedRanges,
    ...(plan.replacements === undefined ? {} : { replacements: plan.replacements })
  };
}

function getChangedLineRange(beforeContent: string, afterContent: string): Record<string, number> {
  if (beforeContent === afterContent) {
    return {};
  }

  const beforeLines = beforeContent.split(/\r?\n/);
  const afterLines = afterContent.split(/\r?\n/);
  let start = 0;
  while (start < beforeLines.length && start < afterLines.length && beforeLines[start] === afterLines[start]) {
    start += 1;
  }

  let beforeEnd = beforeLines.length - 1;
  let afterEnd = afterLines.length - 1;
  while (beforeEnd >= start && afterEnd >= start && beforeLines[beforeEnd] === afterLines[afterEnd]) {
    beforeEnd -= 1;
    afterEnd -= 1;
  }

  const changedStartLine = start + 1;
  const changedEndLine = Math.max(changedStartLine, afterEnd + 1);
  return {
    changedStartLine,
    changedStartColumn: 1,
    changedEndLine,
    changedEndColumn: afterLines[changedEndLine - 1]?.length + 1 || 1
  };
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string') {
    throw createToolError('INVALID_ARGUMENT', `Tool argument "${name}" must be a string.`, { argument: name });
  }

  return value;
}
