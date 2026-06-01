import * as vscode from 'vscode';

import { resolveWorkspacePath } from '../../shared/workspace';
import { EditableDiffInput } from './EditableDiffInput';
import { EditableDiffPreview } from './EditableDiffPreview';
import { applyTextToDocument } from './applyTextToDocument';
import { assertDocumentHasNoUnsavedEdits } from './assertDocumentHasNoUnsavedEdits';
import { createEditablePreview } from './createEditablePreview';
import { createNoopPreview } from './createNoopPreview';
import { createOriginalUri } from './createOriginalUri';
import { originalContents } from './originalContents';
import { readFileIfExists } from './readFileIfExists';
import { registerOriginalContentProvider } from './registerOriginalContentProvider';

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
