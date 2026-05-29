import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { toStructuredToolFailure } from '../../../shared/lib/toolErrors';
import { readFileRangeToolDefinition, runReadFileRangeTool } from './readFileRange';

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aist-read-file-range-tool-'));
});

afterEach(() => {
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
});

describe('read_file_range tool definition', () => {
  it('exposes the public contract to the model', () => {
    expect(readFileRangeToolDefinition).toMatchObject({
      type: 'function',
      function: {
        name: 'read_file_range',
        parameters: {
          required: ['reason', 'nextStep', 'path', 'startLine', 'endLine'],
          additionalProperties: false,
          properties: {
            reason: { type: 'string' },
            nextStep: { type: 'string' },
            path: { type: 'string' },
            startLine: { type: 'number' },
            endLine: { type: 'number' }
          }
        }
      }
    });
  });
});

describe('runReadFileRangeTool', () => {
  it('reads a bounded line range with the same response shape as the old implementation', async () => {
    writeWorkspaceFile({ relativePath: 'src/example.ts', content: ['one', 'two', 'three'].join('\n') });

    await expect(
      runReadFileRangeTool({
        context: { workspaceRoot },
        args: { reason: 'inspect range', nextStep: 'use range', path: 'src/example.ts', startLine: 0, endLine: 2 }
      })
    ).resolves.toMatchObject({
      ok: true,
      path: 'src/example.ts',
      startLine: 1,
      endLine: 2,
      totalLines: 3,
      content: 'one\ntwo',
      truncatedRange: true
    });
  });

  it('caps large ranges to 400 lines', async () => {
    writeWorkspaceFile({
      relativePath: 'src/large.txt',
      content: Array.from({ length: 500 }, (_, index) => `line-${index + 1}`).join('\n')
    });

    const result = await runReadFileRangeTool({
      context: { workspaceRoot },
      args: { reason: 'inspect large range', nextStep: 'use range', path: 'src/large.txt', startLine: 1, endLine: 500 }
    });

    expect(result).toMatchObject({
      ok: true,
      startLine: 1,
      endLine: 400,
      totalLines: 500,
      truncatedRange: true
    });
    expect(String(result.content).split('\n')).toHaveLength(400);
  });

  it('returns a structured argument error when startLine is greater than endLine', async () => {
    writeWorkspaceFile({ relativePath: 'src/example.ts', content: 'one\n' });
    let failure: ReturnType<typeof toStructuredToolFailure> | undefined;

    try {
      await runReadFileRangeTool({
        context: { workspaceRoot },
        args: { reason: 'bad range', nextStep: 'fix range', path: 'src/example.ts', startLine: 3, endLine: 2 }
      });
    } catch (error) {
      failure = toStructuredToolFailure(error);
    }

    expect(failure).toMatchObject({
      ok: false,
      code: 'INVALID_ARGUMENT',
      error: 'Tool argument "startLine" must be less than or equal to "endLine".'
    });
  });
});

function writeWorkspaceFile({ relativePath, content }: { relativePath: string; content: string | Buffer }): void {
  const filePath = path.join(workspaceRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
