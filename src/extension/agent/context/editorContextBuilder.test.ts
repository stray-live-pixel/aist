import { describe, expect, it } from 'vitest';

import { buildEditorContext } from './editorContextBuilder';

const baseInput = {
  fileName: '/workspace/src/example.ts',
  languageId: 'typescript',
  selectionText: '',
  fullText: 'const value = 1;\nconsole.log(value);'
};

describe('buildEditorContext', () => {
  it('omits active editor context in off mode', () => {
    expect(buildEditorContext({ ...baseInput, mode: 'off' })).toBe('');
  });

  it('sends only metadata and selected code in selection mode', () => {
    expect(
      buildEditorContext({
        ...baseInput,
        mode: 'selection',
        selectionText: 'const value = 1;'
      })
    ).toBe('File: /workspace/src/example.ts\n\nLanguage: typescript\n\nSelected code:\nconst value = 1;');
  });

  it('does not include file content when selection mode has no selection', () => {
    expect(buildEditorContext({ ...baseInput, mode: 'selection' })).toBe(
      'File: /workspace/src/example.ts\n\nLanguage: typescript'
    );
  });

  it('includes full file content in file mode without context truncation', () => {
    expect(buildEditorContext({ ...baseInput, mode: 'file' })).toBe(
      'File: /workspace/src/example.ts\n\nLanguage: typescript\n\nFile content:\nconst value = 1;\nconsole.log(value);'
    );
  });

  it('uses selected code in auto mode', () => {
    expect(buildEditorContext({ ...baseInput, mode: 'auto', selectionText: 'console.log(value);' })).toBe(
      'File: /workspace/src/example.ts\n\nLanguage: typescript\n\nSelected code:\nconsole.log(value);'
    );
  });

  it('includes full file content in auto mode when no text is selected', () => {
    expect(buildEditorContext({ ...baseInput, mode: 'auto' })).toBe(
      'File: /workspace/src/example.ts\n\nLanguage: typescript\n\nFile content:\nconst value = 1;\nconsole.log(value);'
    );
  });
});
