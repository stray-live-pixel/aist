import { createToolError } from '../../../../core/shared/lib/toolErrors';
import type { ProjectToolDefinition } from '../../../../core/features/project-tools/projectTools';
import type { LocalDockerIsolationProvider } from '../LocalDockerIsolationProvider';

/**
 * Что это: запускает declarative project tool внутри автономного контейнера.
 * Зачем нужно: project tools должны видеть тот же cloned workspace, что и агент, без доступа к host filesystem.
 * Какую продуктовую проблему решает: isolated agent остаётся переносимым на удалённые Docker runners.
 */
export async function runContainerProjectTool({
  definition,
  args,
  dockerProvider,
  containerName
}: {
  definition: ProjectToolDefinition;
  args: Record<string, unknown>;
  dockerProvider: LocalDockerIsolationProvider;
  containerName: string;
}): Promise<Record<string, unknown>> {
  assertProjectToolCall({ definition, args });
  const result = await dockerProvider.exec({
    container: containerName,
    cwd: '.',
    timeoutMs: 30000,
    maxOutputChars: 1000000,
    stdin: `${JSON.stringify(args)}\n`,
    script: buildProjectToolScript({ definition })
  });

  const base = {
    ok: result.ok,
    toolId: definition.id,
    label: definition.label,
    version: definition.version,
    exitCode: result.exitCode,
    signal: result.signal,
    timedOut: result.timedOut,
    durationMs: result.durationMs,
    stdout: result.stdout,
    stderr: result.stderr,
    stdoutTruncated: false,
    stderrTruncated: false
  };
  if (!result.ok) {
    return {
      ...base,
      code: result.timedOut ? 'TIMEOUT' : 'INVALID_ARGUMENT',
      error: result.timedOut
        ? `Project tool "${definition.label}" timed out after 30000ms.`
        : `Project tool "${definition.label}" exited with code ${result.exitCode}.`
    };
  }
  if (definition.outputMode !== 'json') {
    return base;
  }

  try {
    return { ...base, output: result.stdout.trim() ? JSON.parse(result.stdout) : null };
  } catch (error) {
    return { ...base, ok: false, code: 'INVALID_JSON_OUTPUT', error: formatError(error) };
  }
}

function buildProjectToolScript({ definition }: { definition: ProjectToolDefinition }): string {
  return [
    `export AIST_PROJECT_TOOL_ID=${quote(definition.id)}`,
    `export AIST_PROJECT_TOOL_LABEL=${quote(definition.label)}`,
    `export AIST_PROJECT_TOOL_VERSION=${quote(definition.version)}`,
    `bash ${quote(toContainerToolPath({ scriptPath: definition.scriptPath }))}`
  ].join('\n');
}

function assertProjectToolCall({
  definition,
  args
}: {
  definition: ProjectToolDefinition;
  args: Record<string, unknown>;
}): void {
  if (typeof args.reason !== 'string' || !args.reason.trim()) {
    throw createToolError('INVALID_ARGUMENT', 'Project tool calls must include a non-empty reason.', {
      toolId: definition.id,
      argument: 'reason'
    });
  }
  if (typeof args.nextStep !== 'string' || !args.nextStep.trim()) {
    throw createToolError('INVALID_ARGUMENT', 'Project tool calls must include a non-empty nextStep.', {
      toolId: definition.id,
      argument: 'nextStep'
    });
  }
}

function toContainerToolPath({ scriptPath }: { scriptPath: string }): string {
  const normalized = scriptPath.replace(/\\/g, '/');
  const marker = '/.aist-agent/tools/';
  const markerIndex = normalized.lastIndexOf(marker);
  if (markerIndex >= 0) {
    return `/workspace${normalized.slice(markerIndex)}`;
  }
  return `/workspace/${normalized.replace(/^\/+/, '')}`;
}

function quote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
