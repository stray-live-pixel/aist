import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getDaemonTools, refreshDaemonToolCatalog } from './toolCatalog';

vi.mock('../../shared/workspace', () => ({
  getWorkspaceFolder: () => ({ uri: { fsPath: '/unused' } })
}));

const workspaceRoots: string[] = [];

describe('daemon tool catalog metadata', () => {
  afterEach(async () => {
    for (const root of workspaceRoots.splice(0)) {
      await fs.promises.rm(root, { recursive: true, force: true });
    }
  });

  it('keeps run_skill visible only while custom skills exist', async () => {
    const workspaceRoot = await createWorkspaceRoot();

    await refreshDaemonToolCatalog({ workspaceRoot, skills: [] });
    expect(getDaemonTools([]).map((tool) => tool.function.name)).not.toContain('run_skill');

    const skills = [
      {
        id: 'format',
        label: 'Format',
        description: 'Run formatter',
        command: 'npm run format',
        permission: 'ask' as const
      }
    ];

    expect(getDaemonTools(skills).map((tool) => tool.function.name)).toContain('run_skill');

    await refreshDaemonToolCatalog({ workspaceRoot, skills });
    expect(getDaemonTools(skills).map((tool) => tool.function.name)).toContain('run_skill');

    await refreshDaemonToolCatalog({ workspaceRoot, skills: [] });
    expect(getDaemonTools([]).map((tool) => tool.function.name)).not.toContain('run_skill');
  });
});

async function createWorkspaceRoot(): Promise<string> {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'aist-daemon-tool-catalog-'));
  workspaceRoots.push(root);
  return root;
}
