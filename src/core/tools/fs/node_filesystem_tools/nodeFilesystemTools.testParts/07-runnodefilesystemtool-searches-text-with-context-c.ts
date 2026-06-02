import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { nodeFilesystemTools, runNodeFilesystemTool } from '../nodeFilesystemTools';
import { run, workspaceRoot, writeWorkspaceFile } from './helpers';

describe('runNodeFilesystemTool', () => {
  it('searches text with context, compact modes and excludes', async () => {
    writeWorkspaceFile('src/keep.ts', ['before', 'target line', 'after target'].join('\n'));
    writeWorkspaceFile('src/skip.generated.ts', 'target\n');
    writeWorkspaceFile('node_modules/pkg/index.ts', 'target\n');

    await expect(
      run('grep_search', {
        reason: 'search with context',
        query: 'target',
        path: '.',
        include: '**/*.ts',
        beforeLines: 1,
        afterLines: 1,
        exclude: '**/*.generated.ts'
      })
    ).resolves.toMatchObject({
      ok: true,
      matches: [
        {
          path: 'src/keep.ts',
          line: 2,
          column: 1,
          text: 'target line',
          before: ['before'],
          after: ['after target']
        },
        {
          path: 'src/keep.ts',
          line: 3,
          column: 7,
          text: 'after target',
          before: ['target line'],
          after: []
        }
      ],
      totalMatches: 2
    });

    await expect(
      run('grep_search', {
        reason: 'files only',
        query: 'target',
        filesOnly: true
      })
    ).resolves.toMatchObject({
      ok: true,
      filesOnly: true,
      countOnly: false,
      matches: [{ path: 'src/keep.ts' }, { path: 'src/skip.generated.ts' }]
    });

    await expect(
      run('grep_search', {
        reason: 'counts only',
        query: 'target',
        countOnly: true,
        exclude: '**/*.generated.ts'
      })
    ).resolves.toMatchObject({
      ok: true,
      filesOnly: false,
      countOnly: true,
      totalMatches: 2,
      matches: [{ path: 'src/keep.ts', count: 2 }]
    });
  });
});
