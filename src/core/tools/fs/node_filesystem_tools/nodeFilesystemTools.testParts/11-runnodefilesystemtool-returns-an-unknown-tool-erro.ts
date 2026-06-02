import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { nodeFilesystemTools, runNodeFilesystemTool } from '../nodeFilesystemTools';
import { run, workspaceRoot, writeWorkspaceFile } from './helpers';

describe('runNodeFilesystemTool', () => {
  it('returns an unknown tool error for removed outline_file legacy calls', async () => {
    await expect(
      run('outline_file', {
        reason: 'inspect symbols',
        path: 'src/plain.ts'
      })
    ).resolves.toMatchObject({
      ok: false,
      code: 'INVALID_ARGUMENT',
      error: 'Unknown tool: outline_file',
      details: { toolName: 'outline_file' }
    });
  });
});
