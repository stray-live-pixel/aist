import type * as vscode from 'vscode';

/**
 * Builds the daemon prompt for the VS Code "Edit Selection" command.
 *
 * The extension keeps only the editor workflow locally; model execution remains
 * inside the CLI daemon.
 */
export function buildEditSelectionPrompt(editor: vscode.TextEditor, instruction: string): string {
  const selectedText = editor.document.getText(editor.selection);

  return [
    'You are editing code in VS Code.',
    'Return only the final code that should replace the current selection.',
    'Do not include markdown fences, explanations, or commentary.',
    'Do not call tools or modify files; only answer with the replacement text.',
    '',
    `File: ${editor.document.fileName}`,
    `Language: ${editor.document.languageId}`,
    '',
    `Instruction:\n${instruction}`,
    '',
    `Current selection:\n${selectedText || '(empty selection at cursor)'}`
  ].join('\n');
}
