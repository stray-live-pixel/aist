import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { nodeFilesystemTools, runNodeFilesystemTool } from '../nodeFilesystemTools';
import { run, workspaceRoot, writeWorkspaceFile } from './helpers';

describe('runNodeFilesystemTool', () => {
  it('lists files recursively and applies standard ignores', async () => {
    writeWorkspaceFile('src/index.ts', 'export const value = 1;\n');
    writeWorkspaceFile('src/nested/value.ts', 'export const nested = true;\n');
    writeWorkspaceFile('node_modules/pkg/index.ts', 'ignored\n');
    writeWorkspaceFile('.aist-agent/settings.json', '{}\n');

    const result = await run('list_files', {
      reason: 'inspect tree',
      path: '.',
      maxDepth: 3
    });

    expect(result).toMatchObject({
      ok: true,
      entries: [
        { path: 'src', type: 'directory' },
        { path: 'src/index.ts', type: 'file' },
        { path: 'src/nested', type: 'directory' },
        { path: 'src/nested/value.ts', type: 'file' }
      ],
      truncated: false
    });

    await expect(
      run('list_files', {
        reason: 'inspect subtree',
        path: 'src',
        maxDepth: 1
      })
    ).resolves.toMatchObject({
      ok: true,
      entries: [
        { path: 'index.ts', type: 'file' },
        { path: 'nested', type: 'directory' },
        { path: 'nested/value.ts', type: 'file' }
      ]
    });
  });
});
