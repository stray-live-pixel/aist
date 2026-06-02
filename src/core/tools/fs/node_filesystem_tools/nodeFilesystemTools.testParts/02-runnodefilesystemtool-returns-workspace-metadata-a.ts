import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { nodeFilesystemTools, runNodeFilesystemTool } from '../nodeFilesystemTools';
import { run, workspaceRoot, writeWorkspaceFile } from './helpers';

describe('runNodeFilesystemTool', () => {
  it('returns workspace metadata and repo map hints', async () => {
    writeWorkspaceFile(
      'package.json',
      JSON.stringify({ name: 'sample', scripts: { test: 'vitest run', typecheck: 'tsc --noEmit' } })
    );
    writeWorkspaceFile('tsconfig.json', '{}');
    fs.mkdirSync(path.join(workspaceRoot, 'src'));

    const result = await run('get_workspace_info', { reason: 'inspect workspace' });

    expect(result).toMatchObject({
      ok: true,
      workspaceName: path.basename(workspaceRoot),
      workspacePath: fs.realpathSync(workspaceRoot),
      activeFile: null,
      activeLanguage: null,
      repoMap: {
        packageManager: 'npm',
        packageName: 'sample',
        scripts: ['test', 'typecheck'],
        verificationHints: ['npm run typecheck', 'npm run test']
      }
    });
  });
});
