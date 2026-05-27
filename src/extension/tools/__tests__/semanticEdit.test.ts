import { describe, expect, it } from 'vitest';

import { SMALL_FILE_REWRITE_MAX_BYTES, selectSemanticEdit } from '../semanticEdit';

describe('selectSemanticEdit', () => {
  const baseArgs = {
    reason: 'change one file',
    path: 'src/example.ts',
    strategy: 'auto',
    instructions: 'Update the greeting.'
  };

  it('selects exact replace when expectedChange contains search and replacement', () => {
    const plan = selectSemanticEdit(
      {
        ...baseArgs,
        expectedChange: {
          search: 'hello',
          replacement: 'hi'
        }
      },
      'const value = "hello";\n'
    );

    expect(plan).toMatchObject({
      path: 'src/example.ts',
      nextContent: 'const value = "hi";\n',
      strategyUsed: 'exact_replace',
      replacements: 1,
      changedRanges: [
        {
          path: 'src/example.ts',
          changedStartLine: 1,
          changedEndLine: 1
        }
      ]
    });
  });

  it('selects patch when expectedChange contains a unified diff', () => {
    const plan = selectSemanticEdit(
      {
        ...baseArgs,
        expectedChange: {
          patch: ['--- a/src/example.ts', '+++ b/src/example.ts', '@@ -1,2 +1,2 @@', ' one', '-two', '+dos', ''].join(
            '\n'
          )
        }
      },
      'one\ntwo\n'
    );

    expect(plan).toMatchObject({
      nextContent: 'one\ndos\n',
      strategyUsed: 'patch',
      changedRanges: [{ path: 'src/example.ts', changedStartLine: 2, changedEndLine: 2 }]
    });
  });

  it('selects small-file rewrite when full content is compact enough', () => {
    const plan = selectSemanticEdit(
      {
        ...baseArgs,
        strategy: 'rewrite',
        expectedChange: {
          content: 'export const value = 2;\n'
        }
      },
      'export const value = 1;\n'
    );

    expect(plan).toMatchObject({
      nextContent: 'export const value = 2;\n',
      strategyUsed: 'rewrite_small_file',
      diagnostics: []
    });
  });

  it('rejects large full rewrites without an explicit approval warning flag', () => {
    const largeContent = 'x'.repeat(SMALL_FILE_REWRITE_MAX_BYTES + 1);

    expect(() =>
      selectSemanticEdit(
        {
          ...baseArgs,
          strategy: 'rewrite',
          expectedChange: {
            content: 'small replacement\n'
          }
        },
        largeContent
      )
    ).toThrow('requires expectedChange.explicitLargeRewriteApproval=true');
  });

  it('allows large full rewrites when the approval warning is explicit', () => {
    const plan = selectSemanticEdit(
      {
        ...baseArgs,
        strategy: 'rewrite',
        expectedChange: {
          content: 'small replacement\n',
          explicitLargeRewriteApproval: true
        }
      },
      'x'.repeat(SMALL_FILE_REWRITE_MAX_BYTES + 1)
    );

    expect(plan).toMatchObject({
      strategyUsed: 'rewrite_full_file',
      diagnostics: [
        {
          level: 'warning',
          message: expect.stringContaining('large file')
        }
      ]
    });
  });
});
