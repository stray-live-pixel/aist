import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { toStructuredToolFailure } from '../../../shared/lib/toolErrors';
import { deletePathToolDefinition, runDeletePathTool } from './deletePath';

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aist-delete-path-tool-'));
});

afterEach(() => {
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
});

describe('delete_path tool definition', () => {
  it('keeps the public contract visible to the model', () => {
    expect(deletePathToolDefinition).toMatchObject({
      type: 'function',
      function: {
        name: 'delete_path',
        parameters: {
          required: ['reason', 'nextStep', 'path'],
          additionalProperties: false,
          properties: {
            reason: { type: 'string' },
            nextStep: { type: 'string' },
            path: { type: 'string' },
            recursive: { type: 'boolean' }
          }
        }
      }
    });
  });
});

describe('runDeletePathTool', () => {
  it('deletes a single file through the safe bash path', async () => {
    writeWorkspaceFile({ relativePath: 'src/file.txt', content: 'text\n' });

    await expect(
      runDeletePathTool({
        context: { workspaceRoot },
        args: { reason: 'delete file', nextStep: 'continue', path: 'src/file.txt' }
      })
    ).resolves.toEqual({
      ok: true,
      path: 'src/file.txt',
      recursive: false,
      trash: false
    });

    expect(fs.existsSync(path.join(workspaceRoot, 'src/file.txt'))).toBe(false);
  });

  it('requires recursive=true for directories and deletes an explicit directory when allowed', async () => {
    writeWorkspaceFile({ relativePath: 'src/nested/file.txt', content: 'text\n' });

    await expect(
      runDeletePathTool({
        context: { workspaceRoot },
        args: { reason: 'delete directory unsafely', nextStep: 'stop', path: 'src' }
      })
    ).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
      details: { path: 'src', recursive: false }
    });

    await expect(
      runDeletePathTool({
        context: { workspaceRoot },
        args: { reason: 'delete directory recursively', nextStep: 'continue', path: 'src', recursive: true }
      })
    ).resolves.toMatchObject({
      ok: true,
      path: 'src',
      recursive: true,
      trash: false
    });

    expect(fs.existsSync(path.join(workspaceRoot, 'src'))).toBe(false);
  });

  it('rejects broad shell and glob patterns before filesystem access', async () => {
    await expectDeleteFailure({ path: '**/*', code: 'INVALID_ARGUMENT' });
    await expectDeleteFailure({ path: 'src/*', code: 'INVALID_ARGUMENT' });
    await expectDeleteFailure({ path: 'src/{a,b}.txt', code: 'INVALID_ARGUMENT' });
  });

  it('rejects workspace root and paths outside workspace', async () => {
    await expectDeleteFailure({ path: '.', code: 'INVALID_ARGUMENT' });
    await expectDeleteFailure({ path: './nested/..', code: 'INVALID_ARGUMENT' });
    await expectDeleteFailure({ path: '../outside.txt', code: 'PATH_OUTSIDE_WORKSPACE' });
  });
});

async function expectDeleteFailure({ path: targetPath, code }: { path: string; code: string }): Promise<void> {
  let failure: ReturnType<typeof toStructuredToolFailure> | undefined;

  try {
    await runDeletePathTool({
      context: { workspaceRoot },
      args: { reason: 'unsafe delete', nextStep: 'stop', path: targetPath, recursive: true }
    });
  } catch (error) {
    failure = toStructuredToolFailure(error);
  }

  expect(failure).toMatchObject({
    ok: false,
    code,
    details: { path: targetPath }
  });
}

function writeWorkspaceFile({ relativePath, content }: { relativePath: string; content: string | Buffer }): void {
  const filePath = path.join(workspaceRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
