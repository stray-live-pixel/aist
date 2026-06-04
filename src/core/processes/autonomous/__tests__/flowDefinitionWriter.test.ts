import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { deleteAutonomousFlowDefinition, saveAutonomousFlowDefinition } from '../flowDefinitionWriter';

const tempRoots: string[] = [];

describe('saveAutonomousFlowDefinition', () => {
  afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  it('removes stage files that are no longer referenced by the workflow', async () => {
    const workspaceRoot = await createTempWorkspace();

    await saveAutonomousFlowDefinition(workspaceRoot, {
      id: 'cleanup-flow',
      title: 'Cleanup flow',
      description: '',
      body: '# Cleanup flow',
      stages: [
        { file: '1-plan.md', title: 'Plan', body: '# Plan', contexts: [] },
        { file: '2-build.md', title: 'Build', body: '# Build', contexts: [] }
      ]
    });

    await saveAutonomousFlowDefinition(workspaceRoot, {
      id: 'cleanup-flow',
      title: 'Cleanup flow',
      description: '',
      body: '# Cleanup flow',
      stages: [{ file: '2-build.md', title: 'Build', body: '# Build again', contexts: [] }]
    });

    const flowRoot = path.join(workspaceRoot, '.aist-agent', 'autonomous', 'flows', 'cleanup-flow');
    await expect(fs.access(path.join(flowRoot, '2-build.md'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(flowRoot, '1-plan.md'))).rejects.toThrow();
  });

  it('rejects duplicate stage files', async () => {
    const workspaceRoot = await createTempWorkspace();

    await expect(
      saveAutonomousFlowDefinition(workspaceRoot, {
        id: 'duplicate-flow',
        title: 'Duplicate flow',
        description: '',
        body: '# Duplicate flow',
        stages: [
          { file: '1-stage.md', title: 'First', body: '# First', contexts: [] },
          { file: '1-stage.md', title: 'Second', body: '# Second', contexts: [] }
        ]
      })
    ).rejects.toThrow('Stage files must be unique');
  });

  it('removes the whole workflow directory from the filesystem', async () => {
    const workspaceRoot = await createTempWorkspace();

    await saveAutonomousFlowDefinition(workspaceRoot, {
      id: 'deleted-flow',
      title: 'Deleted flow',
      description: '',
      body: '# Deleted flow',
      stages: [{ file: '1-stage.md', title: 'Stage', body: '# Stage', contexts: [] }]
    });

    const flowRoot = path.join(workspaceRoot, '.aist-agent', 'autonomous', 'flows', 'deleted-flow');
    await expect(fs.access(path.join(flowRoot, '.index.md'))).resolves.toBeUndefined();

    await deleteAutonomousFlowDefinition(workspaceRoot, 'deleted-flow');

    await expect(fs.access(flowRoot)).rejects.toThrow();
  });

  it('never removes the flow index during obsolete stage cleanup', async () => {
    const workspaceRoot = await createTempWorkspace();
    const flowRoot = path.join(workspaceRoot, '.aist-agent', 'autonomous', 'flows', 'index-guard-flow');
    await fs.mkdir(flowRoot, { recursive: true });
    await fs.writeFile(
      path.join(flowRoot, '.index.md'),
      ['---', 'title: Index guard', 'stages:', '  - .index.md', '---', '', '# Index guard', ''].join('\n'),
      'utf8'
    );

    await saveAutonomousFlowDefinition(workspaceRoot, {
      id: 'index-guard-flow',
      title: 'Index guard',
      description: '',
      body: '# Index guard updated',
      stages: [{ file: '1-stage.md', title: 'Stage', body: '# Stage', contexts: [] }]
    });

    await expect(fs.access(path.join(flowRoot, '.index.md'))).resolves.toBeUndefined();
  });
});

async function createTempWorkspace(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aist-flow-writer-'));
  tempRoots.push(root);
  return root;
}
