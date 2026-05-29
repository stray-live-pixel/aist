import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { toStructuredToolFailure } from '../../../shared/lib/toolErrors';
import { grepSearchToolDefinition, runGrepSearchTool } from './grepSearch';

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aist-grep-search-tool-'));
});

afterEach(() => {
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
});

describe('grep_search tool definition', () => {
  it('keeps the public contract visible to the model', () => {
    expect(grepSearchToolDefinition).toMatchObject({
      type: 'function',
      function: {
        name: 'grep_search',
        description:
          'Search workspace files for text or a regular expression and return matching file paths with line numbers.',
        parameters: {
          required: ['reason', 'nextStep', 'query'],
          additionalProperties: false,
          properties: {
            reason: { type: 'string' },
            nextStep: { type: 'string' },
            query: { type: 'string' },
            path: { type: 'string' },
            include: { type: 'string' },
            regex: { type: 'boolean' },
            caseSensitive: { type: 'boolean' },
            contextLines: { type: 'number' },
            beforeLines: { type: 'number' },
            afterLines: { type: 'number' },
            filesOnly: { type: 'boolean' },
            countOnly: { type: 'boolean' },
            exclude: { type: 'string' },
            maxResults: { type: 'number' },
            maxFiles: { type: 'number' }
          }
        }
      }
    });
  });
});

describe('runGrepSearchTool', () => {
  it('searches text with line context and exclude patterns', async () => {
    writeWorkspaceFile({ relativePath: 'src/keep.ts', content: ['before', 'target line', 'after target'].join('\n') });
    writeWorkspaceFile({ relativePath: 'src/skip.generated.ts', content: 'target\n' });
    writeWorkspaceFile({ relativePath: 'node_modules/pkg/index.ts', content: 'target\n' });

    await expect(
      runGrepSearchTool({
        context: { workspaceRoot },
        args: {
          reason: 'search with context',
          nextStep: 'use matches',
          query: 'target',
          path: '.',
          include: '**/*.ts',
          beforeLines: 1,
          afterLines: 1,
          exclude: '**/*.generated.ts'
        }
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
  });

  it('supports filesOnly and countOnly compact modes', async () => {
    writeWorkspaceFile({ relativePath: 'src/keep.ts', content: 'target\ntarget\n' });
    writeWorkspaceFile({ relativePath: 'src/other.ts', content: 'target\n' });

    await expect(
      runGrepSearchTool({
        context: { workspaceRoot },
        args: { reason: 'files only', nextStep: 'use paths', query: 'target', filesOnly: true }
      })
    ).resolves.toMatchObject({
      ok: true,
      filesOnly: true,
      countOnly: false,
      matches: [{ path: 'src/keep.ts' }, { path: 'src/other.ts' }]
    });

    await expect(
      runGrepSearchTool({
        context: { workspaceRoot },
        args: { reason: 'counts only', nextStep: 'use counts', query: 'target', countOnly: true }
      })
    ).resolves.toMatchObject({
      ok: true,
      filesOnly: false,
      countOnly: true,
      totalMatches: 3,
      matches: [
        { path: 'src/keep.ts', count: 2 },
        { path: 'src/other.ts', count: 1 }
      ]
    });
  });

  it('supports regex search and case sensitivity', async () => {
    writeWorkspaceFile({ relativePath: 'src/example.ts', content: 'Alpha\nbeta\nALPHA\n' });

    await expect(
      runGrepSearchTool({
        context: { workspaceRoot },
        args: {
          reason: 'regex search',
          nextStep: 'use regex matches',
          query: '^alpha$',
          regex: true,
          caseSensitive: false
        }
      })
    ).resolves.toMatchObject({
      ok: true,
      regex: true,
      caseSensitive: false,
      totalMatches: 2,
      matches: [
        { path: 'src/example.ts', line: 1, column: 1, text: 'Alpha' },
        { path: 'src/example.ts', line: 3, column: 1, text: 'ALPHA' }
      ]
    });
  });

  it('returns INVALID_ARGUMENT for invalid regex', async () => {
    let failure: ReturnType<typeof toStructuredToolFailure> | undefined;

    try {
      await runGrepSearchTool({
        context: { workspaceRoot },
        args: { reason: 'bad regex', nextStep: 'stop', query: '[', regex: true }
      });
    } catch (error) {
      failure = toStructuredToolFailure(error);
    }

    expect(failure).toMatchObject({
      ok: false,
      code: 'INVALID_ARGUMENT',
      details: { query: '[' }
    });
  });

  it('skips large and binary files without failing the search', async () => {
    writeWorkspaceFile({ relativePath: 'src/keep.txt', content: 'target\n' });
    writeWorkspaceFile({
      relativePath: 'src/binary.txt',
      content: Buffer.from([0, 1, 2, 116, 97, 114, 103, 101, 116])
    });
    writeWorkspaceFile({ relativePath: 'src/large.txt', content: `${'x'.repeat(1024 * 1024 + 1)}target` });

    const result = await runGrepSearchTool({
      context: { workspaceRoot },
      args: { reason: 'skip unreadable search files', nextStep: 'use matches', query: 'target' }
    });

    expect(result).toMatchObject({
      ok: true,
      filesInspected: 1,
      matches: [{ path: 'src/keep.txt', line: 1, column: 1, text: 'target' }],
      totalMatches: 1
    });
  });
});

function writeWorkspaceFile({ relativePath, content }: { relativePath: string; content: string | Buffer }): void {
  const filePath = path.join(workspaceRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
