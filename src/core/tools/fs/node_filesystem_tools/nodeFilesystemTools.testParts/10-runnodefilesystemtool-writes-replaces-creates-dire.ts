import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { nodeFilesystemTools, runNodeFilesystemTool } from '../nodeFilesystemTools';
import { run, workspaceRoot, writeWorkspaceFile } from './helpers';

describe('runNodeFilesystemTool', () => {
  it('writes, replaces, creates directories and deletes without trash', async () => {
    await expect(
      run('create_directory', {
        reason: 'create parent',
        path: 'src/nested'
      })
    ).resolves.toMatchObject({
      ok: true,
      path: 'src/nested'
    });

    await expect(
      run('write_file', {
        reason: 'write file',
        path: 'src/nested/example.ts',
        content: 'one\ntwo\n'
      })
    ).resolves.toMatchObject({
      ok: true,
      path: 'src/nested/example.ts',
      bytes: 8
    });

    await expect(
      run('replace_in_file', {
        reason: 'replace text',
        path: 'src/nested/example.ts',
        search: 'two',
        replace: 'deux'
      })
    ).resolves.toMatchObject({
      ok: true,
      path: 'src/nested/example.ts',
      replacements: 1,
      changedStartLine: 2,
      changedEndLine: 2
    });
    expect(fs.readFileSync(path.join(workspaceRoot, 'src/nested/example.ts'), 'utf8')).toBe('one\ndeux\n');

    await expect(
      run('delete_path', {
        reason: 'delete directory unsafely',
        path: 'src'
      })
    ).resolves.toMatchObject({
      ok: false,
      code: 'INVALID_ARGUMENT'
    });

    await expect(
      run('delete_path', {
        reason: 'delete directory recursively',
        path: 'src',
        recursive: true
      })
    ).resolves.toMatchObject({
      ok: true,
      path: 'src',
      recursive: true,
      trash: false
    });
    expect(fs.existsSync(path.join(workspaceRoot, 'src'))).toBe(false);
  });
});
