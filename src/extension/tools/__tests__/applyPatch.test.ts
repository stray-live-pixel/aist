import { describe, expect, it } from 'vitest';

import { applyUnifiedPatchToContents, parseUnifiedPatch } from '../applyPatch';

describe('applyUnifiedPatchToContents', () => {
  it('applies a single-file unified diff', () => {
    const patch = [
      '--- a/src/example.ts',
      '+++ b/src/example.ts',
      '@@ -1,3 +1,3 @@',
      ' one',
      '-two',
      '+deux',
      ' three',
      ''
    ].join('\n');

    expect(applyUnifiedPatchToContents(patch, { 'src/example.ts': 'one\ntwo\nthree\n' })).toMatchObject({
      files: [
        {
          path: 'src/example.ts',
          oldContent: 'one\ntwo\nthree\n',
          newContent: 'one\ndeux\nthree\n',
          created: false,
          changedStartLine: 2,
          changedEndLine: 2
        }
      ]
    });
  });

  it('applies a multi-file unified diff', () => {
    const patch = [
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '@@ -1,2 +1,2 @@',
      ' alpha',
      '-beta',
      '+bravo',
      '--- a/src/b.ts',
      '+++ b/src/b.ts',
      '@@ -1,2 +1,2 @@',
      '-one',
      '+uno',
      ' two',
      ''
    ].join('\n');

    const result = applyUnifiedPatchToContents(patch, {
      'src/a.ts': 'alpha\nbeta\n',
      'src/b.ts': 'one\ntwo\n'
    });

    expect(result.files.map((file) => [file.path, file.newContent])).toEqual([
      ['src/a.ts', 'alpha\nbravo\n'],
      ['src/b.ts', 'uno\ntwo\n']
    ]);
  });

  it('rejects invalid unified diffs', () => {
    expect(() => parseUnifiedPatch('not a diff')).toThrow('Patch must contain at least one unified diff file section');
  });

  it('rejects binary patches', () => {
    expect(() =>
      parseUnifiedPatch(['diff --git a/image.png b/image.png', 'GIT binary patch', 'literal 1'].join('\n'))
    ).toThrow('Binary patches are not supported');
  });

  it('rejects path traversal in patch headers', () => {
    const patch = ['--- a/../outside.ts', '+++ b/../outside.ts', '@@ -1 +1 @@', '-old', '+new', ''].join('\n');

    expect(() => parseUnifiedPatch(patch)).toThrow('outside the workspace');
  });

  it('rejects absolute patch paths', () => {
    const patch = ['--- C:\\tmp\\outside.ts', '+++ C:\\tmp\\outside.ts', '@@ -1 +1 @@', '-old', '+new', ''].join('\n');

    expect(() => parseUnifiedPatch(patch)).toThrow('workspace-relative');
  });

  it('rejects patches when hunk context conflicts with file contents', () => {
    const patch = [
      '--- a/src/example.ts',
      '+++ b/src/example.ts',
      '@@ -1,2 +1,2 @@',
      ' expected',
      '-old',
      '+new',
      ''
    ].join('\n');

    expect(() => applyUnifiedPatchToContents(patch, { 'src/example.ts': 'actual\nold\n' })).toThrow(
      'Patch does not apply cleanly'
    );
  });
});
