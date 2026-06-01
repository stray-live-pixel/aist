import path from 'node:path';

import { type FrontmatterObject, parseMarkdownFrontmatter } from '../../../shared/lib/frontmatter';
import { PROJECT_TOOLS_RELATIVE_DIR } from './PROJECT_TOOLS_RELATIVE_DIR';
import { ProjectToolDefinition } from './ProjectToolDefinition';
import { ProjectToolDiagnostic } from './ProjectToolDiagnostic';
import { asNonEmptyString } from './asNonEmptyString';
import { createDigest } from './createDigest';
import { isValidToolId } from './isValidToolId';
import { normalizeInputSchema } from './normalizeInputSchema';
import { normalizeOutputMode } from './normalizeOutputMode';
import { normalizePermission } from './normalizePermission';
import { resolveProjectToolScriptPath } from './resolveProjectToolScriptPath';
import { toDiagnostic } from './toDiagnostic';

export function parseProjectToolDefinition(input: {
  markdown: string;
  workspaceRoot: string;
  toolsRoot?: string;
  definitionPath: string;
  scriptContent?: string;
  enabled?: boolean;
}): { tool?: ProjectToolDefinition; diagnostics: ProjectToolDiagnostic[] } {
  const diagnostics: ProjectToolDiagnostic[] = [];
  let attributes: FrontmatterObject;

  try {
    attributes = parseMarkdownFrontmatter(input.markdown).attributes;
  } catch (error) {
    return { diagnostics: [toDiagnostic('projectTool.frontmatterInvalid', error, input.definitionPath)] };
  }

  const id = asNonEmptyString(attributes.id);
  const label = asNonEmptyString(attributes.label);
  const description = asNonEmptyString(attributes.description);
  const script = asNonEmptyString(attributes.script);
  const toolId = id || path.basename(input.definitionPath, '.md');

  if (!id || !isValidToolId(id)) {
    diagnostics.push({
      code: 'projectTool.idInvalid',
      message: 'Project tool must define a valid id using letters, numbers, underscores, or dashes.',
      path: input.definitionPath,
      toolId
    });
  }
  if (!label) {
    diagnostics.push({
      code: 'projectTool.labelMissing',
      message: 'Project tool must define label.',
      path: input.definitionPath,
      toolId
    });
  }
  if (!description) {
    diagnostics.push({
      code: 'projectTool.descriptionMissing',
      message: 'Project tool must define description.',
      path: input.definitionPath,
      toolId
    });
  }
  if (!script) {
    diagnostics.push({
      code: 'projectTool.scriptMissing',
      message: 'Project tool must define script.',
      path: input.definitionPath,
      toolId
    });
  }

  const toolsRoot = input.toolsRoot || path.join(input.workspaceRoot, PROJECT_TOOLS_RELATIVE_DIR);
  let scriptPath = '';
  if (script) {
    const resolved = resolveProjectToolScriptPath(input.workspaceRoot, toolsRoot, script);
    if ('diagnostic' in resolved) {
      diagnostics.push({ ...resolved.diagnostic, path: input.definitionPath, toolId });
    } else {
      scriptPath = resolved.scriptPath;
    }
  }

  const schemaResult = normalizeInputSchema(attributes.input_schema, input.definitionPath, toolId);
  diagnostics.push(...schemaResult.diagnostics);

  const outputMode = normalizeOutputMode(attributes.output_mode, input.definitionPath, toolId, diagnostics);
  const permission = normalizePermission(attributes.permission);

  if (diagnostics.length || !id || !label || !description || !script || !scriptPath || !schemaResult.schema) {
    return { diagnostics };
  }

  const digest = createDigest([input.definitionPath, input.markdown, input.scriptContent || ''].join('\n'));

  return {
    diagnostics,
    tool: {
      source: 'project',
      id,
      label,
      description,
      permission,
      script,
      scriptPath,
      definitionPath: input.definitionPath,
      inputSchema: schemaResult.schema,
      outputMode,
      digest,
      version: digest.slice(0, 12),
      enabled: input.enabled !== false
    }
  };
}
