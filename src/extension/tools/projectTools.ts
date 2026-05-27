import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { type FrontmatterObject, parseMarkdownFrontmatter } from '../autonomous/frontmatter';
import type { OpenRouterTool } from '../openrouter/types';
import { createToolError, toStructuredToolFailure } from '../shared/toolErrors';
import type { ToolPermissionMode } from './permissions';

export const PROJECT_TOOLS_RELATIVE_DIR = path.join('.aist-agent', 'tools');

export type ProjectToolOutputMode = 'text' | 'json';

export type ProjectToolDiagnostic = {
  code: string;
  message: string;
  path?: string;
  toolId?: string;
};

export type ProjectToolDefinition = {
  source: 'project';
  id: string;
  label: string;
  description: string;
  permission: ToolPermissionMode;
  script: string;
  scriptPath: string;
  definitionPath: string;
  inputSchema: Record<string, unknown>;
  outputMode: ProjectToolOutputMode;
  digest: string;
  version: string;
  enabled: boolean;
};

export type ProjectToolDiscoveryResult = {
  tools: ProjectToolDefinition[];
  diagnostics: ProjectToolDiagnostic[];
  digest: string;
  version: string;
};

export type ProjectToolDiscoveryOptions = {
  workspaceRoot: string;
  disabledToolIds?: readonly string[];
};

type ProjectToolReadResult = {
  tool?: ProjectToolDefinition;
  diagnostics: ProjectToolDiagnostic[];
  digestSource: string;
};

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

export async function executeProjectTool(
  definition: ProjectToolDefinition,
  args: Record<string, unknown>,
  workspaceRoot: string
): Promise<Record<string, unknown>> {
  try {
    return await executeProjectToolImpl(definition, args, workspaceRoot);
  } catch (error) {
    return toStructuredToolFailure(error);
  }
}

export function toOpenRouterProjectTool(definition: ProjectToolDefinition): OpenRouterTool {
  return {
    type: 'function',
    function: {
      name: definition.id,
      description: definition.description || definition.label,
      parameters: definition.inputSchema
    }
  };
}

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

function normalizeInputSchema(
  value: unknown,
  definitionPath: string,
  toolId: string
): { schema?: Record<string, unknown>; diagnostics: ProjectToolDiagnostic[] } {
  const diagnostics: ProjectToolDiagnostic[] = [];
  let schema: unknown = value;

  if (typeof value === 'string') {
    try {
      schema = value.trim() ? JSON.parse(value) : undefined;
    } catch (error) {
      diagnostics.push(toDiagnostic('projectTool.inputSchemaInvalid', error, definitionPath, toolId));
      return { diagnostics };
    }
  }

  if (!isRecord(schema)) {
    diagnostics.push({
      code: 'projectTool.inputSchemaMissing',
      message: 'Project tool must define input_schema as a JSON object schema.',
      path: definitionPath,
      toolId
    });
    return { diagnostics };
  }

  if (schema.type !== 'object') {
    diagnostics.push({
      code: 'projectTool.inputSchemaInvalid',
      message: 'Project tool input_schema.type must be "object".',
      path: definitionPath,
      toolId
    });
  }

  const properties = isRecord(schema.properties) ? { ...schema.properties } : undefined;
  if (!properties) {
    diagnostics.push({
      code: 'projectTool.inputSchemaInvalid',
      message: 'Project tool input_schema.properties must be an object.',
      path: definitionPath,
      toolId
    });
  }

  const required = Array.isArray(schema.required) ? schema.required.filter((item) => typeof item === 'string') : [];
  if (properties?.reason && !isReasonSchema(properties.reason)) {
    diagnostics.push({
      code: 'projectTool.reasonInvalid',
      message: 'Project tool reason property must be a string schema.',
      path: definitionPath,
      toolId
    });
  }

  if (diagnostics.length || !properties) {
    return { diagnostics };
  }

  properties.reason ||= {
    type: 'string',
    description: 'A short explanation of why this project tool call is needed.'
  };

  return {
    diagnostics,
    schema: {
      ...schema,
      type: 'object',
      properties,
      required: uniqueStrings(['reason', ...required]),
      additionalProperties: schema.additionalProperties === undefined ? false : schema.additionalProperties
    }
  };
}

async function readProjectToolDefinition(input: {
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

async function executeProjectToolImpl(
  definition: ProjectToolDefinition,
  args: Record<string, unknown>,
  workspaceRoot: string
): Promise<Record<string, unknown>> {
  if (typeof args.reason !== 'string' || !args.reason.trim()) {
    throw createToolError('INVALID_ARGUMENT', 'Project tool calls must include a non-empty reason.', {
      toolId: definition.id,
      argument: 'reason'
    });
  }

  await assertScriptFile(definition);
  const startedAt = Date.now();
  const maxOutputChars = 100000;

  return new Promise((resolve) => {
    const child = spawn('bash', [definition.scriptPath], {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        AIST_PROJECT_TOOL_ID: definition.id,
        AIST_PROJECT_TOOL_LABEL: definition.label,
        AIST_PROJECT_TOOL_VERSION: definition.version
      }
    });
    let stdout = '';
    let stderr = '';
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let closed = false;
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!closed) {
          child.kill('SIGKILL');
        }
      }, 1500).unref();
    }, 30000);

    child.stdout.on('data', (chunk: Buffer) => {
      const next = appendOutput(stdout, chunk.toString('utf8'), maxOutputChars);
      stdout = next.text;
      stdoutTruncated ||= next.truncated;
    });
    child.stderr.on('data', (chunk: Buffer) => {
      const next = appendOutput(stderr, chunk.toString('utf8'), maxOutputChars);
      stderr = next.text;
      stderrTruncated ||= next.truncated;
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      resolve({
        ...toStructuredToolFailure(error),
        ok: false,
        toolId: definition.id,
        durationMs: Date.now() - startedAt
      });
    });
    child.on('close', (exitCode, signal) => {
      closed = true;
      clearTimeout(timeout);
      const ok = exitCode === 0 && !timedOut;
      const base = {
        ok,
        toolId: definition.id,
        label: definition.label,
        version: definition.version,
        exitCode,
        signal,
        timedOut,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr,
        stdoutTruncated,
        stderrTruncated
      };
      if (!ok) {
        resolve({
          ...base,
          code: timedOut ? 'TIMEOUT' : 'INVALID_ARGUMENT',
          error: timedOut
            ? `Project tool "${definition.label}" timed out after 30000ms.`
            : `Project tool "${definition.label}" exited with code ${exitCode}.`
        });
        return;
      }

      if (definition.outputMode === 'json') {
        try {
          resolve({ ...base, output: stdout.trim() ? JSON.parse(stdout) : null });
        } catch (error) {
          resolve({
            ...base,
            ok: false,
            code: 'INVALID_JSON_OUTPUT',
            error: error instanceof Error ? error.message : String(error)
          });
        }
        return;
      }

      resolve(base);
    });
    child.stdin.end(`${JSON.stringify(args)}\n`);
    timeout.unref();
  });
}

async function readToolDefinitionFiles(toolsRoot: string): Promise<string[]> {
  const entries = await fs.readdir(toolsRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
    .sort();
}

async function assertScriptFile(definition: ProjectToolDefinition): Promise<void> {
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

function getScriptPathProbe(markdown: string, workspaceRoot: string, toolsRoot: string): string | undefined {
  try {
    const script = asNonEmptyString(parseMarkdownFrontmatter(markdown).attributes.script);
    if (!script) {
      return undefined;
    }
    const resolved = resolveProjectToolScriptPath(workspaceRoot, toolsRoot, script);
    return 'scriptPath' in resolved ? resolved.scriptPath : undefined;
  } catch {
    return undefined;
  }
}

function resolveProjectToolScriptPath(
  workspaceRoot: string,
  toolsRoot: string,
  script: string
): { scriptPath: string } | { diagnostic: ProjectToolDiagnostic } {
  if (path.isAbsolute(script) || script.includes('\0')) {
    return {
      diagnostic: {
        code: 'projectTool.scriptPathInvalid',
        message: 'Project tool script must be a relative path inside .aist-agent/tools.'
      }
    };
  }

  const normalizedScript = script.replace(/\\/g, '/').replace(/^\/+/, '');
  const base = normalizedScript.startsWith(`${PROJECT_TOOLS_RELATIVE_DIR.replace(/\\/g, '/')}/`)
    ? workspaceRoot
    : toolsRoot;
  const scriptPath = path.resolve(base, normalizedScript);
  if (!isInside(toolsRoot, scriptPath)) {
    return {
      diagnostic: {
        code: 'projectTool.scriptPathEscapesRoot',
        message: `Project tool script escapes .aist-agent/tools: ${script}`
      }
    };
  }

  return { scriptPath };
}

function normalizeOutputMode(
  value: unknown,
  definitionPath: string,
  toolId: string,
  diagnostics: ProjectToolDiagnostic[]
): ProjectToolOutputMode {
  if (value === undefined || value === null || value === '') {
    return 'text';
  }
  if (value === 'text' || value === 'json') {
    return value;
  }
  diagnostics.push({
    code: 'projectTool.outputModeInvalid',
    message: 'Project tool output_mode must be "text" or "json".',
    path: definitionPath,
    toolId
  });
  return 'text';
}

function normalizePermission(value: unknown): ToolPermissionMode {
  return value === 'auto' ? 'auto' : 'ask';
}

function isReasonSchema(value: unknown): boolean {
  return isRecord(value) && value.type === 'string';
}

function isValidToolId(value: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_-]{0,63}$/.test(value);
}

function asNonEmptyString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function createDigest(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function toDiagnostic(code: string, error: unknown, pathValue?: string, toolId?: string): ProjectToolDiagnostic {
  return {
    code,
    message: error instanceof Error ? error.message : String(error),
    path: pathValue,
    toolId
  };
}

function isNotFoundError(error: unknown): boolean {
  return isRecord(error) && error.code === 'ENOENT';
}

function appendOutput(current: string, addition: string, maxChars: number): { text: string; truncated: boolean } {
  const next = current + addition;
  if (next.length <= maxChars) {
    return { text: next, truncated: false };
  }
  return { text: next.slice(0, maxChars), truncated: true };
}
