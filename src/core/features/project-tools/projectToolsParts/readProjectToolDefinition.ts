import fs from 'node:fs/promises';

import { ProjectToolReadResult } from './ProjectToolReadResult';
import { assertScriptFile } from './assertScriptFile';
import { getScriptPathProbe } from './getScriptPathProbe';
import { parseProjectToolDefinition } from './parseProjectToolDefinition';
import { toDiagnostic } from './toDiagnostic';

export async function readProjectToolDefinition(input: {
  workspaceRoot: string;
  toolsRoot: string;
  definitionPath: string;
  disabled: Set<string>;
}): Promise<ProjectToolReadResult> {
  try {
    const markdown = await fs.readFile(input.definitionPath, 'utf8');
    const scriptPathProbe = getScriptPathProbe(markdown, input.workspaceRoot, input.toolsRoot);
    const scriptContent = scriptPathProbe ? await fs.readFile(scriptPathProbe, 'utf8').catch(() => '') : '';
    const parsed = parseProjectToolDefinition({
      markdown,
      workspaceRoot: input.workspaceRoot,
      toolsRoot: input.toolsRoot,
      definitionPath: input.definitionPath,
      scriptContent,
      enabled: true
    });
    const tool = parsed.tool ? { ...parsed.tool, enabled: !input.disabled.has(parsed.tool.id) } : undefined;
    if (tool) {
      await assertScriptFile(tool);
    }
    return {
      tool,
      diagnostics: parsed.diagnostics,
      digestSource: [input.definitionPath, markdown, scriptContent].join('\n')
    };
  } catch (error) {
    return {
      diagnostics: [toDiagnostic('projectTool.readFailed', error, input.definitionPath)],
      digestSource: `${input.definitionPath}\n${String(error)}`
    };
  }
}
