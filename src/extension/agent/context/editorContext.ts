import * as vscode from 'vscode';

import { normalizeEditorContextMode } from '../config/config';
import { type EditorContextInput, buildEditorContext } from './editorContextBuilder';

export function getEditorContext(): string {
  const snapshot = getEditorContextSnapshot();
  return snapshot ? buildEditorContext(snapshot) : '';
}

export function getEditorContextSnapshot(): EditorContextInput | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return undefined;
  }

  const config = vscode.workspace.getConfiguration('openrouterAgent');
  const maxChars = config.get<number>('maxContextChars') || 12000;
  const mode = normalizeEditorContextMode(config.get<string>('editorContextMode'));
  const document = editor.document;
  const selectionText = document.getText(editor.selection);
  const fullText = document.getText();

  return {
    fileName: document.fileName,
    languageId: document.languageId,
    selectionText,
    fullText,
    maxChars,
    mode
  };
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
