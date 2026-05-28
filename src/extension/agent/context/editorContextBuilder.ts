import type { EditorContextMode } from '../../../core/types';

export type EditorContextInput = {
  fileName: string;
  languageId: string;
  selectionText: string;
  fullText: string;
  maxChars: number;
  mode: EditorContextMode;
};

export function buildEditorContext(input: EditorContextInput): string {
  if (input.mode === 'off') {
    return '';
  }

  const header = [`File: ${input.fileName}`, `Language: ${input.languageId}`];
  const selectionText = input.selectionText;

  if (input.mode === 'selection') {
    return [...header, ...(selectionText ? [`Selected code:\n${selectionText}`] : [])].join('\n\n');
  }

  if (input.mode === 'auto') {
    if (selectionText) {
      return [...header, `Selected code:\n${selectionText}`].join('\n\n');
    }

    return input.fullText.length <= input.maxChars
      ? [...header, `File content:\n${input.fullText}`].join('\n\n')
      : header.join('\n\n');
  }

  return [
    ...header,
    selectionText
      ? `Selected code:\n${selectionText}`
      : `File content:\n${truncateText(input.fullText, input.maxChars)}`
  ].join('\n\n');
}

function truncateText(text: string, maxChars: number): string {
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n...<truncated>` : text;
}
