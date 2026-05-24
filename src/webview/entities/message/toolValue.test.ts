import { describe, expect, it } from 'vitest';

import { asRecord, asString, getToolPreview, getToolResult } from './toolValue';

describe('toolValue', () => {
  it('returns nested tool result objects', () => {
    expect(
      getToolResult({
        id: '1',
        role: 'tool',
        name: 'read_file',
        result: {
          result: {
            path: 'src/index.ts'
          }
        },
        createdAt: 0
      })
    ).toEqual({ path: 'src/index.ts' });
  });

  it('ignores preview-only result wrappers', () => {
    expect(
      getToolResult({
        id: '1',
        role: 'tool',
        name: 'read_file',
        result: {
          preview: {
            path: 'src/index.ts'
          }
        },
        createdAt: 0
      })
    ).toBeUndefined();
  });

  it('reads preview records separately', () => {
    expect(
      getToolPreview({
        id: '1',
        role: 'tool',
        result: {
          preview: {
            path: 'src/index.ts'
          }
        },
        createdAt: 0
      })
    ).toEqual({ path: 'src/index.ts' });
  });

  it('guards unknown values before UI code uses them', () => {
    expect(asRecord({ path: 'src/index.ts' })).toEqual({ path: 'src/index.ts' });
    expect(asRecord(['src/index.ts'])).toBeUndefined();
    expect(asString(' src/index.ts ')).toBe(' src/index.ts ');
    expect(asString('   ')).toBeUndefined();
  });
});
