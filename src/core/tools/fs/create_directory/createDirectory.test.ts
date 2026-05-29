import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { toStructuredToolFailure } from '../../../shared/lib/toolErrors';
import { createDirectoryToolDefinition, runCreateDirectoryTool } from './createDirectory';

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aist-create-directory-tool-'));
});

afterEach(() => {
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
});

describe('create_directory tool definition', () => {
  it('keeps the public contract visible to the model', () => {
    expect(createDirectoryToolDefinition).toMatchObject({
      type: 'function',
      function: {
        name: 'create_directory',
        description: 'Create a workspace directory, including parent directories.',
        parameters: {
          required: ['reason', 'nextStep', 'path'],
          additionalProperties: false,
          properties: {
            reason: { type: 'string' },
            nextStep: { type: 'string' },
            path: { type: 'string' }
          }
        }
      }
    });
  });
});

describe('runCreateDirectoryTool', () => {
  it('creates a nested workspace directory and returns the same response shape', async () => {
    await expect(
      runCreateDirectoryTool({
        context: { workspaceRoot },
        args: { reason: 'create parent', nextStep: 'write files', path: 'src/nested' }
      })
    ).resolves.toEqual({
      ok: true,
      path: 'src/nested'
    });

    expect(fs.statSync(path.join(workspaceRoot, 'src/nested')).isDirectory()).toBe(true);
  });

  it('keeps recursive mkdir behavior for already existing directories', async () => {
    fs.mkdirSync(path.join(workspaceRoot, 'src'), { recursive: true });

    await expect(
      runCreateDirectoryTool({
        context: { workspaceRoot },
        args: { reason: 'ensure existing dir', nextStep: 'continue', path: 'src' }
      })
    ).resolves.toEqual({
      ok: true,
      path: 'src'
    });
  });

  it('rejects paths outside workspace through the shared fs path guard', async () => {
    let failure: ReturnType<typeof toStructuredToolFailure> | undefined;

    try {
      await runCreateDirectoryTool({
        context: { workspaceRoot },
        args: { reason: 'unsafe create', nextStep: 'stop', path: '../outside' }
      });
    } catch (error) {
      failure = toStructuredToolFailure(error);
    }

    expect(failure).toMatchObject({
      ok: false,
      code: 'PATH_OUTSIDE_WORKSPACE',
      details: { path: '../outside' }
    });
  });
});
