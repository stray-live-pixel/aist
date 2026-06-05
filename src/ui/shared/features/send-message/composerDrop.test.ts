import { describe, expect, it } from 'vitest';

import type { ComposerDropDataTransfer } from './dropTypes';
import { getShiftDropFullPaths, insertTextIntoPrompt } from './utils';

function createDataTransfer({
  types,
  values,
  files = []
}: {
  types: string[];
  values: Record<string, string>;
  files?: Array<{ path?: string }>;
}): ComposerDropDataTransfer {
  return {
    types,
    files,
    getData(type: string) {
      return values[type] ?? '';
    }
  };
}

describe('composer Shift-drop helpers', () => {
  it('ignores file paths when Shift is not pressed', () => {
    const paths = getShiftDropFullPaths({
      shiftKey: false,
      dataTransfer: createDataTransfer({
        types: ['text/uri-list'],
        values: { 'text/uri-list': 'file:///Users/qa/project/src/App.tsx' }
      })
    });

    expect(paths).toEqual([]);
  });

  it('extracts decoded local paths from VS Code uri-list payload', () => {
    const paths = getShiftDropFullPaths({
      shiftKey: true,
      dataTransfer: createDataTransfer({
        types: ['text/uri-list'],
        values: {
          'text/uri-list':
            '# comment from uri-list\nfile:///Users/qa/My%20Project/src/App.tsx\nfile:///Users/qa/My%20Project/src/features'
        }
      })
    });

    expect(paths).toEqual(['/Users/qa/My Project/src/App.tsx', '/Users/qa/My Project/src/features']);
  });

  it('supports Windows file URI and removes duplicate paths', () => {
    const paths = getShiftDropFullPaths({
      shiftKey: true,
      dataTransfer: createDataTransfer({
        types: ['text/uri-list', 'text/plain'],
        values: {
          'text/uri-list': 'file:///C:/repo/src/file.ts',
          'text/plain': 'C:/repo/src/file.ts'
        }
      })
    });

    expect(paths).toEqual(['C:/repo/src/file.ts']);
  });

  it('prefers real File.path values when Electron exposes them', () => {
    const paths = getShiftDropFullPaths({
      shiftKey: true,
      dataTransfer: createDataTransfer({
        types: ['text/uri-list'],
        files: [{ path: '/Users/qa/project/package.json' }],
        values: { 'text/uri-list': 'file:///Users/qa/project/package.json' }
      })
    });

    expect(paths).toEqual(['/Users/qa/project/package.json']);
  });

  it('inserts dropped path at the current cursor position', () => {
    const result = insertTextIntoPrompt({
      value: 'Read  please',
      text: '/Users/qa/project/src/App.tsx',
      selectionStart: 5,
      selectionEnd: 5
    });

    expect(result).toEqual({
      value: 'Read /Users/qa/project/src/App.tsx please',
      cursorPosition: 34
    });
  });

  it('replaces selected text with dropped path and moves cursor after inserted path', () => {
    const result = insertTextIntoPrompt({
      value: 'Open selected file now',
      text: '/Users/qa/project/src/App.tsx',
      selectionStart: 5,
      selectionEnd: 18
    });

    expect(result).toEqual({
      value: 'Open /Users/qa/project/src/App.tsx now',
      cursorPosition: 34
    });
  });
});
