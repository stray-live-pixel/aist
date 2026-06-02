import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { nodeFilesystemTools, runNodeFilesystemTool } from '../nodeFilesystemTools';
import { run, workspaceRoot, writeWorkspaceFile } from './helpers';

describe('runNodeFilesystemTool', () => {
  it('guards symlink escapes for existing and missing targets', async () => {
    const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aist-node-fs-outside-'));
    try {
      fs.symlinkSync(outsideRoot, path.join(workspaceRoot, 'linked-outside'), 'dir');

      await expect(
        run('read_file', {
          reason: 'unsafe symlink read',
          path: 'linked-outside/secret.txt'
        })
      ).resolves.toMatchObject({
        ok: false,
        code: 'PATH_OUTSIDE_WORKSPACE'
      });

      await expect(
        run('write_file', {
          reason: 'unsafe symlink write',
          path: 'linked-outside/new.txt',
          content: 'secret'
        })
      ).resolves.toMatchObject({
        ok: false,
        code: 'PATH_OUTSIDE_WORKSPACE'
      });
    } finally {
      fs.rmSync(outsideRoot, { recursive: true, force: true });
    }
  });
});
