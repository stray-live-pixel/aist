import * as vscode from 'vscode';

import { applyTextToDocument } from './applyTextToDocument';
import { deleteCreatedFile } from './deleteCreatedFile';
import { saveAndReadDocument } from './saveAndReadDocument';

export async function rollbackPreview(
  targetUri: vscode.Uri,
  originalContent: string,
  originalExists: boolean
): Promise<void> {
  if (!originalExists) {
    await deleteCreatedFile(targetUri);
    return;
  }

  await applyTextToDocument(targetUri, originalContent, true);
  await saveAndReadDocument(targetUri);
}
