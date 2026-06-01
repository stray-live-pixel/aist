import path from 'node:path';
import * as vscode from 'vscode';

import { getFullDocumentRange } from './getFullDocumentRange';
import { textEncoder } from './textEncoder';

export async function applyTextToDocument(targetUri: vscode.Uri, content: string, fileExists: boolean): Promise<void> {
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
