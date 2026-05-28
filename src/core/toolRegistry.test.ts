import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { PROJECT_TOOLS_RELATIVE_DIR } from './projectTools';
import { DefaultToolRegistry } from './toolRegistry';

const tempRoots: string[] = [];

describe('DefaultToolRegistry', () => {
  afterEach(async () => {
    await Promise.all(tempRoots.map((root) => fs.rm(root, { recursive: true, force: true })));
    tempRoots.length = 0;
  });

  it('merges core filesystem, planning, skill and enabled project tools', async () => {
    const workspaceRoot = await createWorkspace();
    await writeProjectTool(workspaceRoot, 'project_echo');
    const registry = new DefaultToolRegistry();

    const snapshot = await registry.refresh({
      workspaceRoot,
      skills: [
        {
          id: 'demo',
          label: 'Demo',
          description: '',
          command: 'echo demo',
          permission: 'ask'
        }
      ]
    });

    expect(snapshot.tools.map((tool) => tool.function.name)).toEqual(
      expect.arrayContaining(['read_file', 'create_plan', 'run_skill', 'project_echo'])
    );
    expect(registry.getTool('read_file')).toMatchObject({ kind: 'builtin' });
    expect(registry.getTool('create_plan')).toMatchObject({ kind: 'planning' });
    expect(registry.getTool('run_skill')).toMatchObject({ kind: 'skill' });
    expect(registry.getTool('project_echo')).toMatchObject({ kind: 'project' });
  });

  it('keeps disabled and conflicting project tools out of model-visible tools', async () => {
    const workspaceRoot = await createWorkspace();
    await writeProjectTool(workspaceRoot, 'project_echo');
    await writeProjectTool(workspaceRoot, 'read_file');
    const registry = new DefaultToolRegistry();

    const snapshot = await registry.refresh({
      workspaceRoot,
      skills: [],
      disabledProjectToolIds: ['project_echo']
    });

    expect(snapshot.projectTools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'project_echo', enabled: false }),
        expect.objectContaining({ id: 'read_file', enabled: true })
      ])
    );
    expect(snapshot.tools.map((tool) => tool.function.name)).not.toContain('project_echo');
    expect(snapshot.tools.filter((tool) => tool.function.name === 'read_file')).toHaveLength(1);
    expect(registry.getProjectTool('project_echo')).toBeUndefined();
    expect(registry.getProjectTool('read_file')).toBeUndefined();
    expect(snapshot.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'projectTool.idConflict' })])
    );
  });
});

async function createWorkspace(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aist-core-tool-registry-'));
  tempRoots.push(root);
  return root;
}

async function writeProjectTool(workspaceRoot: string, id: string): Promise<void> {
  const toolsRoot = path.join(workspaceRoot, PROJECT_TOOLS_RELATIVE_DIR);
  await fs.mkdir(toolsRoot, { recursive: true });
  await fs.writeFile(path.join(toolsRoot, `${id}.sh`), '#!/usr/bin/env bash\ncat\n', 'utf8');
  await fs.writeFile(
    path.join(toolsRoot, `${id}.md`),
    `---
id: ${id}
label: Project echo
description: Echo JSON input.
permission: ask
script: ${id}.sh
input_schema: |
  {"type":"object","properties":{"message":{"type":"string"}},"required":["message"]}
output_mode: json
---
`,
    'utf8'
  );
}
