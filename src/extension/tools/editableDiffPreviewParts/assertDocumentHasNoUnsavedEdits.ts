import * as vscode from 'vscode';

import { findOpenDocument } from './findOpenDocument';

export function assertDocumentHasNoUnsavedEdits(targetUri: vscode.Uri, filePath: string): void {
  const document = findOpenDocument(targetUri);
  if (document?.isDirty) {
    throw new Error(`Cannot preview changes for ${filePath}: the file has unsaved edits.`);
  }
}
