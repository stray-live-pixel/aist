import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { nodeFilesystemTools, runNodeFilesystemTool } from '../nodeFilesystemTools';
import { run, workspaceRoot, writeWorkspaceFile } from './helpers';

describe('runNodeFilesystemTool', () => {
  it('reads full files and bounded line ranges', async () => {
    writeWorkspaceFile('src/example.ts', ['one', 'two', 'three'].join('\n'));

    await expect(
      run('read_file', {
        reason: 'inspect full file',
        path: 'src/example.ts',
        maxChars: 1000
      })
    ).resolves.toMatchObject({
      ok: true,
      path: 'src/example.ts',
      content: 'one\ntwo\nthree',
      truncated: false
    });

    await expect(
      run('read_file_range', {
        reason: 'inspect range',
        path: 'src/example.ts',
        startLine: 0,
        endLine: 2
      })
    ).resolves.toMatchObject({
      ok: true,
      path: 'src/example.ts',
      startLine: 1,
      endLine: 2,
      totalLines: 3,
      content: 'one\ntwo',
      truncatedRange: true
    });
  });
});
