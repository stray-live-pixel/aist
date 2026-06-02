import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { nodeFilesystemTools, runNodeFilesystemTool } from '../nodeFilesystemTools';
import { run, workspaceRoot, writeWorkspaceFile } from './helpers';

describe('runNodeFilesystemTool', () => {
  it('rejects paths outside the workspace before filesystem access', async () => {
    const result = await run('read_file', {
      reason: 'unsafe read',
      path: '../outside.txt'
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'PATH_OUTSIDE_WORKSPACE',
      details: { path: '../outside.txt' }
    });
  });
});
