import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PROJECT_TOOLS_RELATIVE_DIR } from '../../tools/projectTools';
import { AgentToolRegistry } from './toolRegistry';

vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/workspace' }, name: 'workspace' }]
  },
  Uri: {
    file: (fsPath: string) => ({ fsPath })
  },
  FileType: {
    File: 1,
    Directory: 2
  }
}));

const tempRoots: string[] = [];

describe('AgentToolRegistry', () => {
  afterEach(async () => {
    await Promise.all(tempRoots.map((root) => fs.rm(root, { recursive: true, force: true })));
    tempRoots.length = 0;
  });

  it('merges built-in, skill and enabled project tools', async () => {
    const workspaceRoot = await createWorkspace();
    await writeProjectTool(workspaceRoot, 'project_echo');
    const registry = new AgentToolRegistry();

    const snapshot = await registry.refresh({
      workspaceRoot,
      skills: [
        {
          id: 'demo',
          label: 'Demo',
          description: '',
          command: 'echo demo',
          permission: 'ask',
          scope: 'local'
        }
      ]
    });

    expect(snapshot.tools.map((tool) => tool.function.name)).toEqual(
      expect.arrayContaining(['read_file', 'run_skill', 'project_echo'])
    );
    expect(snapshot.projectTools[0]).toMatchObject({ id: 'project_echo', enabled: true });
  });

  it('keeps built-in tools available when a project definition is broken', async () => {
    const workspaceRoot = await createWorkspace();
    const toolsRoot = path.join(workspaceRoot, PROJECT_TOOLS_RELATIVE_DIR);
    await fs.mkdir(toolsRoot, { recursive: true });
    await fs.writeFile(path.join(toolsRoot, 'broken.md'), '---\nid: broken\n---\n', 'utf8');
    const registry = new AgentToolRegistry();

    const snapshot = await registry.refresh({ workspaceRoot, skills: [] });

    expect(snapshot.tools.map((tool) => tool.function.name)).toContain('read_file');
    expect(snapshot.tools.map((tool) => tool.function.name)).not.toContain('broken');
    expect(snapshot.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'projectTool.labelMissing' })])
    );
  });

  it('keeps disabled project tools out of model-visible tools', async () => {
    const workspaceRoot = await createWorkspace();
    await writeProjectTool(workspaceRoot, 'project_echo');
    const registry = new AgentToolRegistry();

    const snapshot = await registry.refresh({
      workspaceRoot,
      skills: [],
      disabledProjectToolIds: ['project_echo']
    });

    expect(snapshot.projectTools[0]).toMatchObject({ id: 'project_echo', enabled: false });
    expect(snapshot.tools.map((tool) => tool.function.name)).not.toContain('project_echo');
  });

  it('does not execute project tools whose id conflicts with built-ins', async () => {
    const workspaceRoot = await createWorkspace();
    await writeProjectTool(workspaceRoot, 'read_file');
    const registry = new AgentToolRegistry();

    const snapshot = await registry.refresh({ workspaceRoot, skills: [] });

    expect(snapshot.tools.filter((tool) => tool.function.name === 'read_file')).toHaveLength(1);
    expect(registry.getProjectTool('read_file')).toBeUndefined();
    expect(snapshot.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'projectTool.idConflict' })])
    );
  });
});

async function createWorkspace(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aist-tool-registry-'));
  tempRoots.push(root);
  return root;
}

async function writeProjectTool(workspaceRoot: string, id: string): Promise<void> {
  const toolsRoot = path.join(workspaceRoot, PROJECT_TOOLS_RELATIVE_DIR);
  await fs.mkdir(toolsRoot, { recursive: true });
  await fs.writeFile(path.join(toolsRoot, 'echo.sh'), '#!/usr/bin/env bash\ncat\n', 'utf8');
  await fs.writeFile(
    path.join(toolsRoot, `${id}.md`),
    `---
id: ${id}
label: Project echo
description: Echo JSON input.
permission: ask
script: echo.sh
input_schema: |
  {"type":"object","properties":{"message":{"type":"string"}},"required":["message"]}
output_mode: json
---
`,
    'utf8'
  );
}
