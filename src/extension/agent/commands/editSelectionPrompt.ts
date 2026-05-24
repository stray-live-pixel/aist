import type * as vscode from 'vscode';

/**
 * Собирает prompt для inline-редактирования выделения в активном редакторе.
 *
 * Отдельная функция нужна, чтобы команда editSelection отвечала только за VS Code
 * workflow: ввод инструкции, вызов модели и замену текста. Prompt остается рядом
 * с правилами своей задачи и его проще менять без риска затронуть контроллер.
 */
export function buildEditSelectionPrompt(editor: vscode.TextEditor, instruction: string): string {
  const selectedText = editor.document.getText(editor.selection);

  return [
    'You are editing code in VS Code.',
    'Return only the final code that should replace the current selection.',
    'Do not include markdown fences, explanations, or commentary.',
    '',
    `File: ${editor.document.fileName}`,
    `Language: ${editor.document.languageId}`,
    '',
    `Instruction:\n${instruction}`,
    '',
    `Current selection:\n${selectedText || '(empty selection at cursor)'}`
  ].join('\n');
}
