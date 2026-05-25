import path from 'node:path';
import { TextDecoder, TextEncoder } from 'node:util';
import * as vscode from 'vscode';

import { resolveWorkspacePath } from '../shared/workspace';

const DIFF_SCHEME = 'aist-diff';
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8');
const originalContents = new Map<string, string>();
let providerRegistered = false;

export type EditableDiffPreview = {
  preview: Record<string, unknown>;
  approve(): Promise<Record<string, unknown>>;
  cleanup(): Promise<void>;
};

type EditableDiffInput = {
  filePath: string;
  nextContent: string;
  generatedReplacements?: number;
};

/**
 * Открывает editable diff без временных файлов: слева виртуальный original,
 * справа настоящий workspace-файл с proposed-версией.
 *
 * Использование: const preview = await showEditableFileDiff({ filePath, nextContent });
 * Правая сторона — реальный документ, поэтому пользователь может править её до
 * Allow; approve сохранит именно финальный текст, а cleanup откатит без Allow.
 */
export async function showEditableFileDiff(input: EditableDiffInput): Promise<EditableDiffPreview> {
  registerOriginalContentProvider();

  const targetUri = resolveWorkspacePath(input.filePath);
  const originalContent = await readFileIfExists(targetUri);
  const originalExists = originalContent !== undefined;
  const beforeContent = originalContent ?? '';

  if (beforeContent === input.nextContent) {
    return createNoopPreview(input.filePath);
  }

  assertDocumentHasNoUnsavedEdits(targetUri, input.filePath);

  const originalUri = createOriginalUri(input.filePath);
  originalContents.set(originalUri.toString(), beforeContent);
  await applyTextToDocument(targetUri, input.nextContent, originalExists);
  await vscode.commands.executeCommand('vscode.diff', originalUri, targetUri, `aist Preview: ${input.filePath}`, {
    preview: true
  });

  return createEditablePreview({
    filePath: input.filePath,
    targetUri,
    originalUri,
    diffTitle: `aist Preview: ${input.filePath}`,
    originalContent: beforeContent,
    originalExists,
    generatedReplacements: input.generatedReplacements
  });
}

function createEditablePreview(params: {
  filePath: string;
  targetUri: vscode.Uri;
  originalUri: vscode.Uri;
  diffTitle: string;
  originalContent: string;
  originalExists: boolean;
  generatedReplacements?: number;
}): EditableDiffPreview {
  let accepted = false;
  let cleaned = false;

  return {
    preview: {
      ok: true,
      path: params.filePath,
      diffShown: true,
      editable: true
    },
    approve: async () => {
      accepted = true;
      const finalContent = await saveAndReadDocument(params.targetUri);
      const changedRange = getChangedLineRange(params.originalContent, finalContent);
      await closeDiffEditor(params.diffTitle);
      return {
        ok: true,
        path: params.filePath,
        bytes: Buffer.byteLength(finalContent, 'utf8'),
        ...changedRange,
        ...(params.generatedReplacements === undefined ? {} : { generatedReplacements: params.generatedReplacements })
      };
    },
    cleanup: async () => {
      if (cleaned) return;
      cleaned = true;
      originalContents.delete(params.originalUri.toString());
      if (!accepted) {
        await rollbackPreview(params.targetUri, params.originalContent, params.originalExists);
      }
    }
  };
}

function createNoopPreview(filePath: string): EditableDiffPreview {
  return {
    preview: {
      ok: true,
      path: filePath,
      diffShown: false,
      reason: 'No file changes to preview.'
    },
    approve: async () => ({ ok: true, path: filePath, changed: false }),
    cleanup: async () => {}
  };
}

function registerOriginalContentProvider(): void {
  if (providerRegistered) return;
  providerRegistered = true;
  vscode.workspace.registerTextDocumentContentProvider(DIFF_SCHEME, {
    provideTextDocumentContent(uri) {
      return originalContents.get(uri.toString()) ?? '';
    }
  });
}

function createOriginalUri(filePath: string): vscode.Uri {
  return vscode.Uri.from({
    scheme: DIFF_SCHEME,
    path: `/${filePath}`,
    query: String(Date.now())
  });
}

function assertDocumentHasNoUnsavedEdits(targetUri: vscode.Uri, filePath: string): void {
  const document = findOpenDocument(targetUri);
  if (document?.isDirty) {
    throw new Error(`Cannot preview changes for ${filePath}: the file has unsaved edits.`);
  }
}

async function applyTextToDocument(targetUri: vscode.Uri, content: string, fileExists: boolean): Promise<void> {
  if (!fileExists) {
    await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(targetUri.fsPath)));
    await vscode.workspace.fs.writeFile(targetUri, textEncoder.encode(''));
  }

  const document = await vscode.workspace.openTextDocument(targetUri);
  const edit = new vscode.WorkspaceEdit();
  edit.replace(targetUri, getFullDocumentRange(document), content);

  const applied = await vscode.workspace.applyEdit(edit);
  if (!applied) {
    throw new Error(`Failed to apply editable diff preview for ${targetUri.fsPath}.`);
  }
}

async function saveAndReadDocument(targetUri: vscode.Uri): Promise<string> {
  const document = await vscode.workspace.openTextDocument(targetUri);
  if (document.isDirty) {
    const saved = await document.save();
    if (!saved) {
      throw new Error(`Failed to save ${targetUri.fsPath}.`);
    }
  }
  return document.getText();
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

async function closeDiffEditor(diffTitle: string): Promise<void> {
  const tab = vscode.window.tabGroups.all.flatMap((group) => group.tabs).find((item) => item.label === diffTitle);
  if (tab) {
    await vscode.window.tabGroups.close(tab);
  }
}

async function rollbackPreview(targetUri: vscode.Uri, originalContent: string, originalExists: boolean): Promise<void> {
  if (!originalExists) {
    await deleteCreatedFile(targetUri);
    return;
  }

  await applyTextToDocument(targetUri, originalContent, true);
  await saveAndReadDocument(targetUri);
}

async function deleteCreatedFile(targetUri: vscode.Uri): Promise<void> {
  try {
    const document = findOpenDocument(targetUri);
    if (document?.isDirty) {
      await applyTextToDocument(targetUri, '', true);
      await saveAndReadDocument(targetUri);
    }
    await vscode.workspace.fs.delete(targetUri, { recursive: false, useTrash: false });
  } catch (error) {
    if (!(error instanceof vscode.FileSystemError)) {
      throw error;
    }
  }
}

async function readFileIfExists(uri: vscode.Uri): Promise<string | undefined> {
  try {
    return textDecoder.decode(await vscode.workspace.fs.readFile(uri));
  } catch {
    return undefined;
  }
}

function findOpenDocument(targetUri: vscode.Uri): vscode.TextDocument | undefined {
  return vscode.workspace.textDocuments.find((document) => document.uri.toString() === targetUri.toString());
}

function getFullDocumentRange(document: vscode.TextDocument): vscode.Range {
  const lastLine = document.lineAt(document.lineCount - 1);
  return new vscode.Range(new vscode.Position(0, 0), lastLine.range.end);
}
