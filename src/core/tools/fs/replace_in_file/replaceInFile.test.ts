import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { toStructuredToolFailure } from '../../../shared/lib/toolErrors';
import { replaceInFileToolDefinition, runReplaceInFileTool } from './replaceInFile';

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aist-replace-in-file-tool-'));
});

afterEach(() => {
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
});

describe('replace_in_file tool definition', () => {
  it('keeps the public contract visible to the model', () => {
    expect(replaceInFileToolDefinition).toMatchObject({
      type: 'function',
      function: {
        name: 'replace_in_file',
        description: 'Replace text in an existing UTF-8 file.',
        parameters: {
          required: ['reason', 'nextStep', 'path', 'search', 'replace'],
          additionalProperties: false,
          properties: {
            reason: { type: 'string' },
            nextStep: { type: 'string' },
            path: { type: 'string' },
            search: { type: 'string' },
            replace: { type: 'string' },
            all: { type: 'boolean' }
          }
        }
      }
    });
  });
});

describe('runReplaceInFileTool', () => {
  it('replaces only the first matching text by default', async () => {
    writeWorkspaceFile({ relativePath: 'src/example.ts', content: 'one\ntwo\ntwo\n' });

    const result = await runReplaceInFileTool({
      context: { workspaceRoot },
      args: {
        reason: 'replace text',
        nextStep: 'verify file',
        path: 'src/example.ts',
        search: 'two',
        replace: 'deux'
      }
    });

    expect(result).toEqual({
      ok: true,
      path: 'src/example.ts',
      replacements: 1,
      changedStartLine: 2,
      changedStartColumn: 1,
      changedEndLine: 2,
      changedEndColumn: 5
    });
    expect(readWorkspaceFile({ relativePath: 'src/example.ts' })).toBe('one\ndeux\ntwo\n');
  });

  it('replaces all matching text when all=true', async () => {
    writeWorkspaceFile({ relativePath: 'notes.txt', content: 'cat dog cat' });

    const result = await runReplaceInFileTool({
      context: { workspaceRoot },
      args: {
        reason: 'replace all text',
        nextStep: 'verify full replacement',
        path: 'notes.txt',
        search: 'cat',
        replace: 'fox',
        all: true
      }
    });

    expect(result).toEqual({
      ok: true,
      path: 'notes.txt',
      replacements: 2,
      changedStartLine: 1,
      changedStartColumn: 1,
      changedEndLine: 1,
      changedEndColumn: 12
    });
    expect(readWorkspaceFile({ relativePath: 'notes.txt' })).toBe('fox dog fox');
  });

  it('returns TEXT_NOT_FOUND and leaves the file unchanged when search text is absent', async () => {
    writeWorkspaceFile({ relativePath: 'src/example.ts', content: 'one\ntwo\n' });
    let failure: ReturnType<typeof toStructuredToolFailure> | undefined;

    try {
      await runReplaceInFileTool({
        context: { workspaceRoot },
        args: {
          reason: 'replace missing text',
          nextStep: 'read nearby range',
          path: 'src/example.ts',
          search: 'missing',
          replace: 'new'
        }
      });
    } catch (error) {
      failure = toStructuredToolFailure(error);
    }

    expect(failure).toMatchObject({
      ok: false,
      code: 'TEXT_NOT_FOUND',
      details: { path: 'src/example.ts' }
    });
    expect(readWorkspaceFile({ relativePath: 'src/example.ts' })).toBe('one\ntwo\n');
  });

  it('rejects paths outside the workspace through the shared fs path guard', async () => {
    let failure: ReturnType<typeof toStructuredToolFailure> | undefined;

    try {
      await runReplaceInFileTool({
        context: { workspaceRoot },
        args: {
          reason: 'unsafe replace',
          nextStep: 'stop',
          path: '../outside.txt',
          search: 'old',
          replace: 'new'
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
