import * as vscode from 'vscode';

export function getEditorContext(): string {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return '';
  }

  const config = vscode.workspace.getConfiguration('openrouterAgent');
  const maxChars = config.get<number>('maxContextChars') || 12000;
  const document = editor.document;
  const selectionText = document.getText(editor.selection);
  const fullText = document.getText();
  const truncatedText = fullText.length > maxChars ? `${fullText.slice(0, maxChars)}\n...<truncated>` : fullText;

  return [
    `File: ${document.fileName}`,
    `Language: ${document.languageId}`,
    selectionText ? `Selected code:\n${selectionText}` : `File content:\n${truncatedText}`
  ].join('\n\n');
}

export function stripCodeFence(text: string): string {
  const trimmed = String(text || '').trim();
  const match = trimmed.match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```$/);
  return match ? match[1] : trimmed;
}

export async function replaceSelection(editor: vscode.TextEditor, text: string): Promise<void> {
  const selection = editor.selection;
  await editor.edit((editBuilder) => {
    if (selection.isEmpty) {
      editBuilder.insert(selection.active, text);
    } else {
      editBuilder.replace(selection, text);
    }
  });
}
