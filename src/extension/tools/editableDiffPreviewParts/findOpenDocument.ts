import * as vscode from 'vscode';

export function findOpenDocument(targetUri: vscode.Uri): vscode.TextDocument | undefined {
  return vscode.workspace.textDocuments.find((document) => document.uri.toString() === targetUri.toString());
}
