import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { nodeFilesystemTools, runNodeFilesystemTool } from '../nodeFilesystemTools';
import { run, workspaceRoot, writeWorkspaceFile } from './helpers';

describe('runNodeFilesystemTool', () => {
  it('runs bash scripts inside the workspace with timeout handling', async () => {
    const success = await run('run_bash_script', {
      reason: 'verify cwd',
      script: 'pwd && printf done',
      timeoutMs: 5000
    });

    expect(success).toMatchObject({
      ok: true,
      cwd: '.',
      exitCode: 0,
      timedOut: false
    });
    expect(String(success.stdout)).toContain(workspaceRoot);
    expect(String(success.stdout)).toContain('done');

    await expect(
      run('run_bash_script', {
        reason: 'verify timeout',
        script: 'sleep 2',
        timeoutMs: 1000
      })
    ).resolves.toMatchObject({
      ok: false,
      code: 'TIMEOUT',
      timedOut: true
    });
  });
});
