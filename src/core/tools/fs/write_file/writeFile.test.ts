import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { toStructuredToolFailure } from '../../../shared/lib/toolErrors';
import { runWriteFileTool, writeFileToolDefinition } from './writeFile';

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aist-write-file-tool-'));
});

afterEach(() => {
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
});

describe('write_file tool definition', () => {
  it('keeps the public contract visible to the model', () => {
    expect(writeFileToolDefinition).toMatchObject({
      type: 'function',
      function: {
        name: 'write_file',
        description: 'Create or overwrite a UTF-8 text file in the workspace.',
        parameters: {
          required: ['reason', 'nextStep', 'path', 'content'],
          additionalProperties: false,
          properties: {
            reason: { type: 'string' },
            nextStep: { type: 'string' },
            path: { type: 'string' },
            content: { type: 'string' }
          }
        }
      }
    });
  });
});

describe('runWriteFileTool', () => {
  it('creates a UTF-8 file and missing parent directories without changing the result shape', async () => {
    const result = await runWriteFileTool({
      context: { workspaceRoot },
      args: {
        reason: 'write file',
        nextStep: 'read it later',
        path: 'src/nested/example.ts',
        content: 'one\ntwo\n'
      }
    });

    expect(result).toEqual({
      ok: true,
      path: 'src/nested/example.ts',
      bytes: 8,
      changedStartLine: 1,
      changedStartColumn: 1,
      changedEndLine: 2,
      changedEndColumn: 4
    });
    expect(readWorkspaceFile({ relativePath: 'src/nested/example.ts' })).toBe('one\ntwo\n');
  });

  it('overwrites an existing file and reports the same changed line range as before', async () => {
    writeWorkspaceFile({ relativePath: 'src/example.ts', content: 'one\ntwo\nthree\n' });

    const result = await runWriteFileTool({
      context: { workspaceRoot },
      args: {
        reason: 'overwrite file',
        nextStep: 'verify updated file',
        path: 'src/example.ts',
        content: 'one\ndeux\nthree\n'
      }
    });

    expect(result).toMatchObject({
      ok: true,
      path: 'src/example.ts',
      bytes: 15,
      changedStartLine: 2,
      changedStartColumn: 1,
      changedEndLine: 2,
      changedEndColumn: 5
    });
    expect(readWorkspaceFile({ relativePath: 'src/example.ts' })).toBe('one\ndeux\nthree\n');
  });

  it('returns no changed range when content stays the same', async () => {
    writeWorkspaceFile({ relativePath: 'same.txt', content: 'same content' });

    await expect(
      runWriteFileTool({
        context: { workspaceRoot },
        args: {
          reason: 'rewrite same file',
          nextStep: 'keep result stable',
          path: 'same.txt',
          content: 'same content'
        }
      })
    ).resolves.toEqual({
      ok: true,
      path: 'same.txt',
      bytes: 12
    });
  });

  it('rejects paths outside the workspace through the shared fs path guard', async () => {
    let failure: ReturnType<typeof toStructuredToolFailure> | undefined;

    try {
      await runWriteFileTool({
        context: { workspaceRoot },
        args: {
          reason: 'unsafe write',
          nextStep: 'stop',
          path: '../outside.txt',
          content: 'secret'
        }
      });
    } catch (error) {
      failure = toStructuredToolFailure(error);
    }

    expect(failure).toMatchObject({
      ok: false,
      code: 'PATH_OUTSIDE_WORKSPACE',
      details: { path: '../outside.txt' }
    });
  });
});

function writeWorkspaceFile({ relativePath, content }: { relativePath: string; content: string | Buffer }): void {
  const filePath = path.join(workspaceRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function readWorkspaceFile({ relativePath }: { relativePath: string }): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}
