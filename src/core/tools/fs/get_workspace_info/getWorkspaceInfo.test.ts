import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getWorkspaceInfoToolDefinition, runGetWorkspaceInfoTool } from './getWorkspaceInfo';

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aist-workspace-info-tool-'));
});

afterEach(() => {
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
});

describe('get_workspace_info tool definition', () => {
  it('keeps the hidden tool contract close to the runner', () => {
    expect(getWorkspaceInfoToolDefinition).toMatchObject({
      type: 'function',
      function: {
        name: 'get_workspace_info',
        description: 'Return workspace metadata and repository map hints.',
        parameters: {
          required: ['reason'],
          additionalProperties: false,
          properties: {
            reason: { type: 'string' },
            nextStep: { type: 'string' }
          }
        }
      }
    });
  });
});

describe('runGetWorkspaceInfoTool', () => {
  it('returns workspace metadata and repo map hints without changing response shape', async () => {
    writeWorkspaceFile({
      relativePath: 'package.json',
      content: JSON.stringify({ name: 'sample', scripts: { test: 'vitest run', typecheck: 'tsc --noEmit' } })
    });
    writeWorkspaceFile({ relativePath: 'tsconfig.json', content: '{}\n' });
    fs.mkdirSync(path.join(workspaceRoot, 'src'));

    const result = await runGetWorkspaceInfoTool({ context: { workspaceRoot } });

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

  it('uses optional workspace and editor metadata from the tool context', async () => {
    const result = await runGetWorkspaceInfoTool({
      context: {
        workspaceRoot,
        workspaceName: 'Custom Workspace',
        activeFile: 'src/index.ts',
        activeLanguage: 'typescript'
      }
    });

    expect(result).toMatchObject({
      ok: true,
      workspaceName: 'Custom Workspace',
      activeFile: 'src/index.ts',
      activeLanguage: 'typescript'
    });
  });
});

function writeWorkspaceFile({ relativePath, content }: { relativePath: string; content: string | Buffer }): void {
  const filePath = path.join(workspaceRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
