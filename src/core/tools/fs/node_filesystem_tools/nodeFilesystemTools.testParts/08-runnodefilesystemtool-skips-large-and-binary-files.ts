import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { nodeFilesystemTools, runNodeFilesystemTool } from '../nodeFilesystemTools';
import { run, workspaceRoot, writeWorkspaceFile } from './helpers';

describe('runNodeFilesystemTool', () => {
  it('skips large and binary files during grep_search', async () => {
    writeWorkspaceFile('src/keep.txt', 'target\n');
    writeWorkspaceFile('src/binary.txt', Buffer.from([0, 1, 2, 116, 97, 114, 103, 101, 116]));
    writeWorkspaceFile('src/large.txt', `${'x'.repeat(1024 * 1024 + 1)}target`);

    const result = await run('grep_search', {
      reason: 'skip unreadable search files',
      query: 'target'
    });

    expect(result).toMatchObject({
      ok: true,
      filesInspected: 1,
      matches: [{ path: 'src/keep.txt', line: 1, column: 1, text: 'target' }],
      totalMatches: 1
    });
  });
});
