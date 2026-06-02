import fs from 'node:fs/promises';
import path from 'node:path';

import { createToolError } from '../../../shared/lib/toolErrors';
import { ProjectToolDefinition } from './ProjectToolDefinition';
import { isInside } from './isInside';

export async function assertScriptFile(definition: ProjectToolDefinition): Promise<void> {
  const stat = await fs.stat(definition.scriptPath);
  if (!stat.isFile()) {
    throw createToolError('INVALID_ARGUMENT', `Project tool script must be a file: ${definition.script}`, {
      toolId: definition.id,
      script: definition.script
    });
  }
  const realToolsRoot = await fs.realpath(path.dirname(definition.definitionPath));
  const realScriptPath = await fs.realpath(definition.scriptPath);
  if (!isInside(realToolsRoot, realScriptPath)) {
    throw createToolError(
      'PATH_OUTSIDE_WORKSPACE',
      `Project tool script escapes .aist-agent/tools: ${definition.script}`,
      {
        toolId: definition.id,
        script: definition.script
      }
    );
  }
}
