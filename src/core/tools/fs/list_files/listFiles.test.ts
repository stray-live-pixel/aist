import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { toStructuredToolFailure } from '../../../shared/lib/toolErrors';
import { listFilesToolDefinition, runListFilesTool } from './listFiles';

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aist-list-files-tool-'));
});

afterEach(() => {
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
});

describe('list_files tool definition', () => {
  it('keeps the public contract visible to the model', () => {
    expect(listFilesToolDefinition).toMatchObject({
      type: 'function',
      function: {
        name: 'list_files',
        description: 'List files and directories under a workspace-relative path.',
        parameters: {
          required: ['reason', 'nextStep'],
          additionalProperties: false,
          properties: {
            reason: { type: 'string' },
            nextStep: { type: 'string' },
            path: { type: 'string' },
            maxDepth: { type: 'number' },
            limit: { type: 'number' }
          }
        }
      }
    });
  });
});

describe('runListFilesTool', () => {
  it('lists files recursively with stable ordering and standard ignores', async () => {
    writeWorkspaceFile({ relativePath: 'src/index.ts', content: 'export const value = 1;\n' });
    writeWorkspaceFile({ relativePath: 'src/nested/value.ts', content: 'export const nested = true;\n' });
    writeWorkspaceFile({ relativePath: 'node_modules/pkg/index.ts', content: 'ignored\n' });
    writeWorkspaceFile({ relativePath: '.aist-agent/settings.json', content: '{}\n' });

    await expect(
      runListFilesTool({
        context: { workspaceRoot },
        args: { reason: 'inspect tree', nextStep: 'use tree', path: '.', maxDepth: 3 }
      })
    ).resolves.toMatchObject({
      ok: true,
      path: '.',
      entries: [
        { path: 'src', type: 'directory' },
        { path: 'src/index.ts', type: 'file' },
        { path: 'src/nested', type: 'directory' },
        { path: 'src/nested/value.ts', type: 'file' }
      ],
      truncated: false
    });
  });

  it('keeps maxDepth, limit and path result behavior unchanged', async () => {
    writeWorkspaceFile({ relativePath: 'src/a.ts', content: 'a\n' });
    writeWorkspaceFile({ relativePath: 'src/deep/b.ts', content: 'b\n' });

    const result = await runListFilesTool({
      context: { workspaceRoot },
      args: { reason: 'inspect subtree', nextStep: 'use limited tree', path: 'src', maxDepth: 0, limit: 2 }
    });

    expect(result).toMatchObject({
      ok: true,
      path: 'src',
      entries: [
        { path: 'a.ts', type: 'file' },
        { path: 'deep', type: 'directory' }
      ],
      truncated: true
    });
  });

  it('returns a structured domain error when path is not a directory', async () => {
    writeWorkspaceFile({ relativePath: 'src/file.txt', content: 'text\n' });
    let failure: ReturnType<typeof toStructuredToolFailure> | undefined;

    try {
      await runListFilesTool({
        context: { workspaceRoot },
        args: { reason: 'inspect file as dir', nextStep: 'stop', path: 'src/file.txt' }
      });
    } catch (error) {
      failure = toStructuredToolFailure(error);
    }

    expect(failure).toMatchObject({
      ok: false,
      code: 'NOT_A_DIRECTORY',
      details: { path: 'src/file.txt' }
    });
  });
});

function writeWorkspaceFile({ relativePath, content }: { relativePath: string; content: string | Buffer }): void {
  const filePath = path.join(workspaceRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
