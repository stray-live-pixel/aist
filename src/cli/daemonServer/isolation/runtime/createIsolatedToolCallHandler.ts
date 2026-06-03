import type {
  AgentRuntimeToolCallHandler,
  AgentRuntimeToolCallHandlerParams
} from '../../../../core/app/runtime/agentRuntime';
import type { AuxiliaryModelInvoker } from '../../../../core/entities/model/auxiliaryModel';
import type { AgentSkill } from '../../../../core/features/skills/skills';
import { runNodeSkillTool } from '../../../../core/features/skills/skills';
import type { ToolRegistry } from '../../../../core/features/tool-execution/toolRegistry';
import { ToolRunner, type ToolRunnerAuxiliaryModelSettings } from '../../../../core/features/tool-execution/toolRunner';
import { createNodeFilesystemToolRunner } from '../../../../core/tools/fs/node_filesystem_tools/nodeFilesystemTools';
import type { LocalDockerIsolationProvider } from '../LocalDockerIsolationProvider';

export function createIsolatedToolCallHandler({
  registry,
  worktreePath,
  containerName,
  dockerProvider,
  emitLog,
  getSkills,
  getAuxiliaryToolSettings,
  auxiliaryModel,
  workspaceName
}: {
  registry: ToolRegistry;
  worktreePath: string;
  containerName: string;
  dockerProvider: LocalDockerIsolationProvider;
  emitLog?: (level: 'info' | 'warn' | 'error', message: string) => Promise<void>;
  getSkills: () => Promise<readonly AgentSkill[]>;
  getAuxiliaryToolSettings: (toolName: string) => Promise<ToolRunnerAuxiliaryModelSettings>;
  auxiliaryModel: AuxiliaryModelInvoker;
  workspaceName: string;
}): AgentRuntimeToolCallHandler {
  const hostFilesystemRunner = createNodeFilesystemToolRunner({
    context: { workspaceRoot: worktreePath, workspaceName }
  });

  return async (params: AgentRuntimeToolCallHandlerParams) => {
    const runner = new ToolRunner({
      registry,
      context: params.context,
      approvalService: {
        getPermission: () => 'auto',
        requestApproval: async () => ({
          action: 'approve',
          approved: true,
          continueAfterDeny: false
        })
      },
      filesystem: {
        execute: async (toolName, args) => {
          if (toolName === 'run_bash_script') {
            return runBashInContainer({ dockerProvider, containerName, args, emitLog });
          }
          return hostFilesystemRunner(toolName, args);
        }
      },
      projectTools: {
        execute: (toolName, args) => registry.runProjectTool(toolName, args, worktreePath)
      },
      skills: {
        execute: async (_toolName, args) =>
          runNodeSkillTool({
            skills: await getSkills(),
            workspaceRoot: worktreePath,
            args
          })
      },
      auxiliaryModel,
      getAuxiliaryModelSettings: (toolName) => getAuxiliaryToolSettings(toolName),
      events: params.events,
      runRepository: params.runRepository,
      workspaceRoot: worktreePath,
      getRunId: () => params.runId
    });
    await runner.handleToolCall(params);
  };
}

async function runBashInContainer({
  dockerProvider,
  containerName,
  args,
  emitLog
}: {
  dockerProvider: LocalDockerIsolationProvider;
  containerName: string;
  args: Record<string, unknown>;
  emitLog?: (level: 'info' | 'warn' | 'error', message: string) => Promise<void>;
}): Promise<Record<string, unknown>> {
  const script = typeof args.script === 'string' ? args.script : '';
  if (!script.trim()) {
    return { ok: false, error: { code: 'INVALID_ARGUMENT', message: 'Tool argument "script" must not be empty.' } };
  }

  const cwd = typeof args.cwd === 'string' && args.cwd.trim() ? args.cwd : '.';
  const timeoutMs = clampNumber(args.timeoutMs, 30000, 1000, 120000);
  const maxOutputChars = clampNumber(args.maxOutputChars, 200000, 1000, 1000000);
  await emitLog?.('info', `$ ${script}\n[cwd: ${cwd}]`);
  const result = await dockerProvider.exec({ container: containerName, script, cwd, timeoutMs, maxOutputChars });
  await emitLog?.(result.ok ? 'info' : 'error', formatContainerExecutionLog({ result, timeoutMs }));

  return {
    ok: result.ok,
    cwd,
    exitCode: result.exitCode,
    signal: result.signal,
    timedOut: result.timedOut,
    durationMs: result.durationMs,
    stdout: result.stdout,
    stderr: result.stderr,
    stdoutTruncated: false,
    stderrTruncated: false,
    error: result.ok
      ? undefined
      : {
          code: result.timedOut ? 'TIMEOUT' : 'COMMAND_FAILED',
          message: result.timedOut ? `Bash script timed out after ${timeoutMs}ms.` : 'Bash script failed.'
        }
  };
}

function formatContainerExecutionLog({
  result,
  timeoutMs
}: {
  result: Awaited<ReturnType<LocalDockerIsolationProvider['exec']>>;
  timeoutMs: number;
}): string {
  const lines = [
    `container command ${result.ok ? 'completed' : 'failed'}: exitCode=${result.exitCode ?? 'null'} durationMs=${result.durationMs}`
  ];
  if (result.timedOut) {
    lines.push(`timed out after ${timeoutMs}ms`);
  }
  if (result.stdout.trim()) {
    lines.push(`stdout:\n${truncateMiddle(result.stdout.trim(), 4000)}`);
  }
  if (result.stderr.trim()) {
    lines.push(`stderr:\n${truncateMiddle(result.stderr.trim(), 4000)}`);
  }
  return lines.join('\n');
}

function truncateMiddle(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value;
  }

  const side = Math.floor((maxChars - 32) / 2);
  return `${value.slice(0, side)}\n... truncated ...\n${value.slice(value.length - side)}`;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
