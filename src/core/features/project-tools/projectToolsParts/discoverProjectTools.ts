import path from 'node:path';

import { PROJECT_TOOLS_RELATIVE_DIR } from './PROJECT_TOOLS_RELATIVE_DIR';
import { ProjectToolDefinition } from './ProjectToolDefinition';
import { ProjectToolDiagnostic } from './ProjectToolDiagnostic';
import { ProjectToolDiscoveryOptions } from './ProjectToolDiscoveryOptions';
import { ProjectToolDiscoveryResult } from './ProjectToolDiscoveryResult';
import { createDigest } from './createDigest';
import { isNotFoundError } from './isNotFoundError';
import { readProjectToolDefinition } from './readProjectToolDefinition';
import { readToolDefinitionFiles } from './readToolDefinitionFiles';
import { toDiagnostic } from './toDiagnostic';

export async function discoverProjectTools(options: ProjectToolDiscoveryOptions): Promise<ProjectToolDiscoveryResult> {
  const toolsRoot = path.join(options.workspaceRoot, PROJECT_TOOLS_RELATIVE_DIR);
  const disabledToolIds = new Set(options.disabledToolIds || []);
  const diagnostics: ProjectToolDiagnostic[] = [];
  const tools: ProjectToolDefinition[] = [];
  const digestSources: string[] = [];

  const entries = await readToolDefinitionFiles(toolsRoot).catch((error: unknown) => {
    if (isNotFoundError(error)) {
      return [];
    }
    diagnostics.push(toDiagnostic('projectTools.readFailed', error, toolsRoot));
    return [];
  });

  for (const fileName of entries) {
    const definitionPath = path.join(toolsRoot, fileName);
    const result = await readProjectToolDefinition({
      workspaceRoot: options.workspaceRoot,
      toolsRoot,
      definitionPath,
      disabled: disabledToolIds
    });
    diagnostics.push(...result.diagnostics);
    digestSources.push(result.digestSource);
    if (result.tool) {
      tools.push(result.tool);
    }
  }

  const digest = createDigest(digestSources.sort().join('\n'));
  return { tools, diagnostics, digest, version: digest.slice(0, 12) };
}
