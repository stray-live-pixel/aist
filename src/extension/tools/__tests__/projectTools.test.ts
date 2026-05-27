import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  PROJECT_TOOLS_RELATIVE_DIR,
  discoverProjectTools,
  executeProjectTool,
  parseProjectToolDefinition
} from '../projectTools';

const tempRoots: string[] = [];

describe('projectTools', () => {
  afterEach(async () => {
    await Promise.all(tempRoots.map((root) => fs.rm(root, { recursive: true, force: true })));
    tempRoots.length = 0;
  });

  it('parses markdown definitions and injects a required reason schema', () => {
    const workspaceRoot = '/workspace';
    const parsed = parseProjectToolDefinition({
      markdown: definitionMarkdown({
        inputSchema: '{"type":"object","properties":{"message":{"type":"string"}},"required":["message"]}'
      }),
      workspaceRoot,
      definitionPath: path.join(workspaceRoot, PROJECT_TOOLS_RELATIVE_DIR, 'echo.md'),
      scriptContent: '#!/usr/bin/env bash\n'
    });

    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.tool?.id).toBe('project_echo');
    expect(parsed.tool?.permission).toBe('ask');
    expect(parsed.tool?.outputMode).toBe('json');
    expect(parsed.tool?.inputSchema.required).toEqual(['reason', 'message']);
    expect((parsed.tool?.inputSchema.properties as Record<string, unknown>).reason).toMatchObject({ type: 'string' });
  });

  it('rejects script path traversal before execution', () => {
    const workspaceRoot = '/workspace';
    const parsed = parseProjectToolDefinition({
      markdown: definitionMarkdown({ script: '../escape.sh' }),
      workspaceRoot,
      definitionPath: path.join(workspaceRoot, PROJECT_TOOLS_RELATIVE_DIR, 'bad.md')
    });

    expect(parsed.tool).toBeUndefined();
    expect(parsed.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'projectTool.scriptPathEscapesRoot'
        })
      ])
    );
  });

  it('discovers valid tools while reporting broken definitions as diagnostics', async () => {
    const workspaceRoot = await createWorkspace();
    const toolsRoot = path.join(workspaceRoot, PROJECT_TOOLS_RELATIVE_DIR);
    await fs.mkdir(toolsRoot, { recursive: true });
    await fs.writeFile(path.join(toolsRoot, 'ok.md'), definitionMarkdown({}), 'utf8');
    await fs.writeFile(path.join(toolsRoot, 'echo.sh'), '#!/usr/bin/env bash\ncat\n', 'utf8');
    await fs.writeFile(path.join(toolsRoot, 'broken.md'), '---\nid: broken\n---\n', 'utf8');

    const result = await discoverProjectTools({ workspaceRoot });

    expect(result.tools.map((tool) => tool.id)).toEqual(['project_echo']);
    expect(result.version).toHaveLength(12);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'projectTool.labelMissing' })])
    );
  });

  it('executes a project script with JSON stdin from the workspace root', async () => {
    const workspaceRoot = await createWorkspace();
    const toolsRoot = path.join(workspaceRoot, PROJECT_TOOLS_RELATIVE_DIR);
    await fs.mkdir(toolsRoot, { recursive: true });
    const scriptPath = path.join(toolsRoot, 'echo.sh');
    await fs.writeFile(
      scriptPath,
      [
        '#!/usr/bin/env bash',
        'node -e \'const chunks=[]; process.stdin.on("data", c=>chunks.push(c)); process.stdin.on("end",()=>{ console.log(JSON.stringify({ input: JSON.parse(Buffer.concat(chunks).toString("utf8")), cwd: process.cwd() })); });\''
      ].join('\n'),
      'utf8'
    );
    const parsed = parseProjectToolDefinition({
      markdown: definitionMarkdown({}),
      workspaceRoot,
      definitionPath: path.join(toolsRoot, 'echo.md'),
      scriptContent: await fs.readFile(scriptPath, 'utf8')
    });

    expect(parsed.tool).toBeDefined();
    const result = await executeProjectTool(
      parsed.tool!,
      { reason: 'verify stdin contract', message: 'hello' },
      workspaceRoot
    );

    expect(result).toMatchObject({
      ok: true,
      output: {
        input: { reason: 'verify stdin contract', message: 'hello' },
        cwd: await fs.realpath(workspaceRoot)
      }
    });
  });
});

async function createWorkspace(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aist-project-tools-'));
  tempRoots.push(root);
  return root;
}

function definitionMarkdown({
  script = 'echo.sh',
  inputSchema = '{"type":"object","properties":{"message":{"type":"string"}},"required":["message"]}'
}: {
  script?: string;
  inputSchema?: string;
}): string {
  return `---
id: project_echo
label: Project echo
description: Echo JSON input.
permission: ask
script: ${script}
input_schema: |
  ${inputSchema}
output_mode: json
---

Project echo tool.
`;
}
