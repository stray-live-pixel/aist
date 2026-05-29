import { TextDecoder } from 'node:util';
import * as vscode from 'vscode';

import { createToolError } from '../../core/shared/lib/toolErrors';
import type { ToolApprovalRequest } from '../../core/shared/types/types';
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

  return undefined;
}

async function showFileDiff(
  filePath: string,
  nextContent: string,
  generatedReplacements?: number
): Promise<FilesystemToolPreview> {
  return showEditableFileDiff({ filePath, nextContent, generatedReplacements });
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string') {
    throw createToolError('INVALID_ARGUMENT', `Tool argument "${name}" must be a string.`, { argument: name });
  }

  return value;
}
