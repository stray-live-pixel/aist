import type { EditorContextInput } from '../../../core/shared/types/types';

export function buildEditorContext(input: EditorContextInput): string {
  if (input.mode === 'off') {
    return '';
  }

  const header = [`File: ${input.fileName}`, `Language: ${input.languageId}`];
  const selectionText = input.selectionText;

  if (input.mode === 'selection') {
    return [...header, ...(selectionText ? [`Selected code:\n${selectionText}`] : [])].join('\n\n');
  }

  if (input.mode === 'auto' && selectionText) {
    return [...header, `Selected code:\n${selectionText}`].join('\n\n');
  }

  return [...header, selectionText ? `Selected code:\n${selectionText}` : `File content:\n${input.fullText}`].join(
    '\n\n'
  );
}
