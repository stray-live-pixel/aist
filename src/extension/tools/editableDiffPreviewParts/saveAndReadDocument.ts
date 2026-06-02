import * as vscode from 'vscode';

export async function saveAndReadDocument(targetUri: vscode.Uri): Promise<string> {
  const document = await vscode.workspace.openTextDocument(targetUri);
  if (document.isDirty) {
    const saved = await document.save();
    if (!saved) {
      throw new Error(`Failed to save ${targetUri.fsPath}.`);
    }
  }
  return document.getText();
}
