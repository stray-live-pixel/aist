import { describe, expect, it } from 'vitest';

import { buildEditSelectionPrompt } from './editSelectionPrompt';

describe('buildEditSelectionPrompt', () => {
  it('keeps edit selection daemon prompt constrained to replacement text', () => {
    const editor = {
      document: {
        fileName: '/workspace/src/example.ts',
        languageId: 'typescript',
        getText: () => 'const value = 1;'
      },
      selection: {}
    };

    expect(buildEditSelectionPrompt(editor as never, 'make it readonly')).toBe(
      [
        'You are editing code in VS Code.',
        'Return only the final code that should replace the current selection.',
        'Do not include markdown fences, explanations, or commentary.',
        'Do not call tools or modify files; only answer with the replacement text.',
        '',
        'File: /workspace/src/example.ts',
        'Language: typescript',
        '',
        'Instruction:\nmake it readonly',
        '',
        'Current selection:\nconst value = 1;'
      ].join('\n')
    );
  });
});
