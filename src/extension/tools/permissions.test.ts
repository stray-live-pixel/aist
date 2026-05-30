import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { refreshDaemonToolCatalog } from '../agent/daemon/toolCatalog';
import { getToolPermissionPresets } from './permissions';

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: () => ({
      get: vi.fn(),
      update: vi.fn()
    })
  },
  ConfigurationTarget: { Workspace: 2 }
}));

vi.mock('../shared/workspace', () => ({
  getWorkspaceFolder: () => ({ uri: { fsPath: '/unused' } })
}));

const workspaceRoots: string[] = [];

describe('tool permission presets', () => {
  afterEach(async () => {
    const cleanupRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'aist-tool-permissions-cleanup-'));
    await refreshDaemonToolCatalog({ workspaceRoot: cleanupRoot, skills: [] });
    await fs.promises.rm(cleanupRoot, { recursive: true, force: true });

    for (const root of workspaceRoots.splice(0)) {
      await fs.promises.rm(root, { recursive: true, force: true });
    }
  });

  it('runs skills automatically in fast edit and autonomous modes', async () => {
    await refreshDaemonToolCatalog({
      workspaceRoot: await createWorkspaceRoot(),
      skills: [
        {
          id: 'format',
          label: 'Format',
          description: 'Run formatter for quick code changes.',
          command: 'npm run format',
          permission: 'ask'
        }
      ]
    });

    const presets = getToolPermissionPresets();

    expect(presets.find((preset) => preset.id === 'fast-edit')?.permissions.run_skill).toBe('auto');
    expect(presets.find((preset) => preset.id === 'autonomous')?.permissions.run_skill).toBe('auto');
  });
});

async function createWorkspaceRoot(): Promise<string> {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'aist-tool-permissions-'));
  workspaceRoots.push(root);
  return root;
}
