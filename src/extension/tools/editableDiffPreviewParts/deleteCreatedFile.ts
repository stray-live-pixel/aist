import * as vscode from 'vscode';

import { applyTextToDocument } from './applyTextToDocument';
import { findOpenDocument } from './findOpenDocument';
import { saveAndReadDocument } from './saveAndReadDocument';

export async function deleteCreatedFile(targetUri: vscode.Uri): Promise<void> {
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
