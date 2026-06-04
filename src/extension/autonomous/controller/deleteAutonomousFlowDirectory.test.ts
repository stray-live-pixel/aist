import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { deleteAutonomousFlowDirectory, getAutonomousFlowDeletePath } from './deleteAutonomousFlowDirectory';

const tempRoots: string[] = [];

describe('deleteAutonomousFlowDirectory', () => {
  afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  it('removes native workflow directory from the current workspace', async () => {
    const workspaceRoot = await createTempWorkspace();
    const flowRoot = path.join(workspaceRoot, '.aist-agent', 'autonomous', 'flows', 'demo-flow');
    await fs.mkdir(flowRoot, { recursive: true });
    await fs.writeFile(path.join(flowRoot, '.index.md'), '# Demo flow', 'utf8');

    await deleteAutonomousFlowDirectory({
      workspaceRoot,
      flow: { id: 'demo-flow', sourcePath: '/stale/workspace/.aist-agent/autonomous/flows/demo-flow' }
    });

    await expect(fs.access(flowRoot)).rejects.toThrow();
  });

  it('rejects unsafe workflow ids before removing files', async () => {
    const workspaceRoot = await createTempWorkspace();

    await expect(
      deleteAutonomousFlowDirectory({ workspaceRoot, flow: { id: '../demo-flow', sourcePath: '' } })
    ).rejects.toThrow('Workflow id must contain only letters');
  });

  it('always targets the current workspace native workflows root', async () => {
    const workspaceRoot = await createTempWorkspace();

    expect(
      getAutonomousFlowDeletePath({
        workspaceRoot,
        flow: { id: 'demo-flow', sourcePath: '/another/workspace/.aist-agent/autonomous/flows/demo-flow' }
      })
    ).toBe(path.join(workspaceRoot, '.aist-agent', 'autonomous', 'flows', 'demo-flow'));
  });
});

async function createTempWorkspace(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aist-extension-workflow-delete-'));
  tempRoots.push(root);
  return root;
}
