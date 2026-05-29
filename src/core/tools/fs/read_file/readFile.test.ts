import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { toStructuredToolFailure } from '../../../shared/lib/toolErrors';
import { readFileToolDefinition, runReadFileTool } from './readFile';

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aist-read-file-tool-'));
});

afterEach(() => {
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
});

describe('read_file tool definition', () => {
  it('keeps the public contract visible to the model', () => {
    expect(readFileToolDefinition).toMatchObject({
      type: 'function',
      function: {
        name: 'read_file',
        description: 'Read a UTF-8 text file from the workspace.',
        parameters: {
          required: ['reason', 'nextStep', 'path'],
          additionalProperties: false,
          properties: {
            reason: { type: 'string' },
            nextStep: { type: 'string' },
            path: { type: 'string' },
            maxChars: { type: 'number' }
          }
        }
      }
    });
  });
});

describe('runReadFileTool', () => {
  it('reads a UTF-8 workspace file without changing the response shape', async () => {
    writeWorkspaceFile({ relativePath: 'src/example.ts', content: 'one\ntwo\nthree' });

    await expect(
      runReadFileTool({
        context: { workspaceRoot },
        args: { reason: 'inspect file', nextStep: 'use content', path: 'src/example.ts', maxChars: 1000 }
      })
    ).resolves.toEqual({
      ok: true,
      path: 'src/example.ts',
      content: 'one\ntwo\nthree',
      truncated: false
    });
  });

  it('uses the same maxChars clamp and truncation behavior as the old implementation', async () => {
    writeWorkspaceFile({ relativePath: 'big.txt', content: 'x'.repeat(1200) });

    const result = await runReadFileTool({
      context: { workspaceRoot },
      args: { reason: 'inspect file', nextStep: 'use content', path: 'big.txt', maxChars: 10 }
    });

    // Минимальный лимит остаётся 1000 символов: маленькое значение модели не ломает полезный ответ.
    expect(result).toMatchObject({ ok: true, path: 'big.txt', truncated: true });
    expect(String(result.content)).toHaveLength(1000);
  });

  it('rejects paths outside the workspace through the shared fs path guard', async () => {
    let failure: ReturnType<typeof toStructuredToolFailure> | undefined;

    try {
      await runReadFileTool({
        context: { workspaceRoot },
        args: { reason: 'unsafe read', nextStep: 'stop', path: '../outside.txt' }
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
