import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import packageJson from '../../package.json';
import {
  type ConfigScope,
  FileBackedConfigStore,
  FileSecretStore,
  OPENROUTER_API_KEY_SECRET_KEY
} from '../core/app/config/config';
import {
  type AgentRuntimeChatRepository,
  type AgentRuntimeConfigSnapshot,
  AgentRuntimeService,
  type AgentRuntimeToolCallHandler
} from '../core/app/runtime/agentRuntime';
import { ChatRepository } from '../core/entities/chat/chatRepository';
import { AgentMemoryStore, createMemoryStorePaths } from '../core/entities/memory/memory';
import { CodexAuthSessionProvider } from '../core/entities/model/codexAuth';
import { CodexResponsesTransport } from '../core/entities/model/codexTransport';
import { DEFAULT_MODEL, FALLBACK_MODEL_OPTIONS } from '../core/entities/model/modelDefaults';
import type { FetchLike, ModelClient } from '../core/entities/model/modelTransport';
import { OpenRouterTransport } from '../core/entities/model/openrouterTransport';
import { RunRepository } from '../core/entities/run/runRepository';
import {
  globalAistRoot,
  globalMemoryFile,
  globalSettingsFile,
  globalToolsDir,
  globalWorkspaceChatsDir,
  globalWorkspaceRunsDir,
  globalWorkspaceTelemetryDir,
  safeMkdir,
  workspaceAistRoot,
  workspaceSettingsFile,
  workspaceToolsDir
} from '../core/entities/storage/storage';
import { getToolExecutionRequirement } from '../core/features/approval/approvalProtocol';
import { getRelevantMemoryPromptBlockBySubagent } from '../core/features/memory-subagent';
import { type AgentSkill, runNodeSkillTool } from '../core/features/skills/skills';
import { buildFileAgentSystemPrompt } from '../core/features/system-prompt/filePromptConfig';
import { type AgentLanguage } from '../core/features/system-prompt/prompts';
import { DefaultToolRegistry, type ToolRegistry } from '../core/features/tool-execution/toolRegistry';
import { ToolRunner, type ToolRunnerExecutionAdapter } from '../core/features/tool-execution/toolRunner';
import {
  AutonomousBackend,
  type AutonomousBackendEvent,
  type AutonomousEngineId,
  type AutonomousExportFormat,
  type AutonomousLaunchOptions,
  type AutonomousSessionView,
  type AutonomousState,
  type AutonomousVcsIsolationOptions
} from '../core/processes/autonomous';
import { getRepoVerificationContextNote } from '../core/shared/lib/repoMap';
import { getHeadlessToolPermission } from '../core/shared/permissions';
import type {
  Chat,
  ChatMessage,
  ChatSummary,
  CodexServiceTier,
  JsonObject,
  JsonValue,
  ModelProvider,
  OpenRouterModelOption,
  ReasoningEffort,
  RuntimeEvent,
  ToolApprovalDecision,
  ToolPermissionMode
} from '../core/shared/types/types';
import { createNodeFilesystemToolRunner } from '../core/tools/fs/node_filesystem_tools/nodeFilesystemTools';
import { AistDaemonServer } from './daemon';
import { DaemonJsonRpcClient } from './daemonClient';
import { type DaemonAutonomousStopResult, getDaemonSocketPath } from './daemonProtocol';

export const CLI_NAME = 'aist';
export const CLI_VERSION = packageJson.version;
export const CLI_APPROVAL_REQUIRED_EXIT_CODE = 3;

export type CliApprovalMode = 'ask' | 'auto-readonly' | 'auto-all' | 'deny';

export type CliCommand =
  | { readonly kind: 'help' }
  | { readonly kind: 'version' }
  | { readonly kind: 'daemon'; readonly workspace?: string; readonly socket?: string }
  | { readonly kind: 'doctor'; readonly workspace?: string }
  | { readonly kind: 'paths'; readonly workspace?: string }
  | { readonly kind: 'chatNew'; readonly workspace?: string; readonly model?: string; readonly json: boolean }
  | { readonly kind: 'chatList'; readonly workspace?: string; readonly json: boolean }
  | { readonly kind: 'chatGet'; readonly chatId: string; readonly workspace?: string; readonly json: boolean }
  | { readonly kind: 'chatClear'; readonly chatId: string; readonly workspace?: string; readonly json: boolean }
  | {
      readonly kind: 'chatSetModel';
      readonly chatId: string;
      readonly model: string;
      readonly workspace?: string;
      readonly json: boolean;
    }
  | {
      readonly kind: 'chatAsk';
      readonly chatId: string;
      readonly workspace?: string;
      readonly prompt?: string;
      readonly stdin: boolean;
      readonly jsonl: boolean;
      readonly approvalMode: CliApprovalMode;
    }
  | { readonly kind: 'configGet'; readonly key?: string; readonly workspace?: string; readonly json: boolean }
  | {
      readonly kind: 'configSet';
      readonly key: string;
      readonly value: JsonValue;
      readonly scope: ConfigScope;
      readonly workspace?: string;
      readonly json: boolean;
    }
  | { readonly kind: 'authOpenRouterSetKey'; readonly fromEnv: boolean; readonly json: boolean }
  | { readonly kind: 'authOpenRouterStatus'; readonly json: boolean }
  | { readonly kind: 'authCodexStatus'; readonly json: boolean }
  | { readonly kind: 'modelsList'; readonly provider: CliModelProvider; readonly json: boolean }
  | { readonly kind: 'modelsRefresh'; readonly provider: CliModelProvider; readonly json: boolean }
  | { readonly kind: 'autonomousList'; readonly workspace?: string; readonly json: boolean }
  | {
      readonly kind: 'autonomousFlowStart';
      readonly flowId: string;
      readonly workspace?: string;
      readonly launch: AutonomousLaunchOptions;
      readonly jsonl: boolean;
    }
  | {
      readonly kind: 'autonomousRunStart';
      readonly runId: string;
      readonly workspace?: string;
      readonly launch: AutonomousLaunchOptions;
      readonly jsonl: boolean;
    }
  | { readonly kind: 'autonomousStop'; readonly sessionId: string; readonly workspace?: string; readonly json: boolean }
  | {
      readonly kind: 'autonomousExport';
      readonly sessionId: string;
      readonly workspace?: string;
      readonly format: AutonomousExportFormat;
    };

export type CliModelProvider = ModelProvider | 'all';

export class CliUsageError extends Error {
  readonly exitCode = 2;

  constructor(message: string) {
    super(message);
    this.name = 'CliUsageError';
  }
}

export class CliCommandError extends Error {
  readonly exitCode: number;
  readonly code: string;
  readonly details?: JsonObject;

  constructor(code: string, message: string, options: { exitCode?: number; details?: JsonObject } = {}) {
    super(message);
    this.name = 'CliCommandError';
    this.code = code;
    this.exitCode = options.exitCode ?? 1;
    this.details = options.details;
  }
}

export type CliWriter = (text: string) => void;

export type RunCliOptions = {
  cwd?: string;
  homeDir?: string;
  env?: Record<string, string | undefined>;
  stdin?: NodeJS.ReadableStream;
  fetch?: FetchLike;
  modelClient?: ModelClient;
  toolRegistry?: ToolRegistry;
  filesystemToolRunner?: ToolRunnerExecutionAdapter;
  stdout?: CliWriter;
  stderr?: CliWriter;
};

export type CliPaths = {
  readonly workspaceRoot: string;
  readonly workspaceAistRoot: string;
  readonly workspaceSettingsFile: string;
  readonly workspaceChatsDir: string;
  readonly workspaceRunsDir: string;
  readonly workspaceTelemetryDir: string;
  readonly workspaceToolsDir: string;
  readonly globalAistRoot: string;
  readonly globalSettingsFile: string;
  readonly globalMemoryFile: string;
  readonly globalToolsDir: string;
};

export type DoctorCheckStatus = 'ok' | 'fail';

export type DoctorCheck = {
  readonly name: string;
  readonly status: DoctorCheckStatus;
  readonly message: string;
};

export type DoctorResult = {
  readonly ok: boolean;
  readonly paths: Pick<CliPaths, 'workspaceRoot' | 'workspaceAistRoot' | 'globalAistRoot'>;
  readonly checks: readonly DoctorCheck[];
};

export function parseCliArgs(args: readonly string[]): CliCommand {
  if (args.length === 0) {
    return { kind: 'help' };
  }

  const [command, ...rest] = args;

  if (command === '--help' || command === '-h') {
    assertNoExtraArgs(rest, command);
    return { kind: 'help' };
  }

  if (command === '--version' || command === '-v') {
    assertNoExtraArgs(rest, command);
    return { kind: 'version' };
  }

  if (command === 'doctor' || command === 'paths') {
    const options = parseWorkspaceOptions(command, rest);
    if (options.showHelp) {
      return { kind: 'help' };
    }

    return { kind: command, workspace: options.workspace };
  }

  if (command === 'daemon') {
    return parseDaemonCommand(rest);
  }

  if (command === 'config') {
    return parseConfigCommand(rest);
  }

  if (command === 'chat') {
    return parseChatCommand(rest);
  }

  if (command === 'auth') {
    return parseAuthCommand(rest);
  }

  if (command === 'models') {
    return parseModelsCommand(rest);
  }

  if (command === 'autonomous') {
    return parseAutonomousCommand(rest);
  }

  if (command.startsWith('-')) {
    throw new CliUsageError(`Unknown option: ${command}`);
  }

  throw new CliUsageError(`Unknown command: ${command}`);
}

export async function runCli(args: readonly string[], options: RunCliOptions = {}): Promise<number> {
  const stdout = options.stdout || ((text: string) => process.stdout.write(text));
  const stderr = options.stderr || ((text: string) => process.stderr.write(text));
  const wantsJson = args.includes('--json') || args.includes('--jsonl');

  try {
    const command = parseCliArgs(args);

    if (command.kind === 'help') {
      stdout(formatHelpOutput());
      return 0;
    }

    if (command.kind === 'version') {
      stdout(`${CLI_VERSION}\n`);
      return 0;
    }

    if (command.kind === 'paths') {
      stdout(formatPathsOutput(resolveCliPaths({ ...options, workspace: command.workspace })));
      return 0;
    }

    if (command.kind === 'doctor') {
      const result = await runDoctor({ ...options, workspace: command.workspace });
      stdout(formatDoctorOutput(result));

      if (!result.ok) {
        stderr(`${CLI_NAME} doctor failed: one or more checks failed.\n`);
        return 1;
      }

      return 0;
    }

    if (command.kind === 'daemon') {
      return await runDaemonCommand(command, options, stderr);
    }

    if (command.kind === 'chatNew') {
      const result = await createChatCommandResult(command, options);
      stdout(formatChatNewOutput(result, command.json));
      return 0;
    }

    if (command.kind === 'chatList') {
      const result = await listChatsCommandResult(command, options);
      stdout(formatChatListOutput(result, command.json));
      return 0;
    }

    if (command.kind === 'chatGet') {
      const result = await getChatCommandResult(command, options);
      stdout(formatChatGetOutput(result, command.json));
      return 0;
    }

    if (command.kind === 'chatClear') {
      const result = await clearChatCommandResult(command, options);
      stdout(formatChatClearOutput(result, command.json));
      return 0;
    }

    if (command.kind === 'chatSetModel') {
      const result = await setChatModelCommandResult(command, options);
      stdout(formatChatSetModelOutput(result, command.json));
      return 0;
    }

    if (command.kind === 'chatAsk') {
      return await runChatAskCommand(command, options, stdout, stderr);
    }

    if (command.kind === 'configGet') {
      const result = await getConfigCommandResult(command, options);
      stdout(formatConfigGetOutput(result, command.json));
      return 0;
    }

    if (command.kind === 'configSet') {
      const result = await setConfigCommandResult(command, options);
      stdout(formatConfigSetOutput(result, command.json));
      return 0;
    }

    if (command.kind === 'authOpenRouterSetKey') {
      const result = await setOpenRouterKey(command, options, stderr);
      stdout(formatOpenRouterAuthStatusOutput(result, command.json));
      return 0;
    }

    if (command.kind === 'authOpenRouterStatus') {
      const result = await getOpenRouterAuthStatus(options);
      stdout(formatOpenRouterAuthStatusOutput(result, command.json));
      return 0;
    }

    if (command.kind === 'authCodexStatus') {
      const result = await getCodexAuthStatus(options);
      stdout(formatCodexAuthStatusOutput(result, command.json));
      return 0;
    }

    if (command.kind === 'modelsList' || command.kind === 'modelsRefresh') {
      const result = await getModelsList(command.provider, options, command.kind === 'modelsRefresh');
      stdout(formatModelsListOutput(result, command.json));
      return 0;
    }

    if (command.kind === 'autonomousList') {
      const result = await getAutonomousStateCommandResult(command, options);
      stdout(formatAutonomousListOutput(result, command.json));
      return 0;
    }

    if (command.kind === 'autonomousFlowStart' || command.kind === 'autonomousRunStart') {
      return await runAutonomousStartCommand(command, options, stdout);
    }

    if (command.kind === 'autonomousStop') {
      const result = await stopAutonomousSessionCommandResult(command, options);
      stdout(formatAutonomousStopOutput(result, command.json));
      return 0;
    }

    if (command.kind === 'autonomousExport') {
      const result = await exportAutonomousSessionCommandResult(command, options);
      stdout(result.content);
      return 0;
    }

    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const exitCode = error instanceof CliUsageError || error instanceof CliCommandError ? error.exitCode : 1;
    if (wantsJson) {
      stderr(formatCliErrorJson(error, message));
    } else {
      stderr(`${CLI_NAME}: ${message}\n`);
    }

    if (error instanceof CliUsageError) {
      if (!wantsJson) {
        stderr(`Run '${CLI_NAME} --help' for usage.\n`);
      }
    }

    return exitCode;
  }
}

export function formatHelpOutput(): string {
  return `AIST command line interface

Usage:
  aist --help
  aist --version
  aist paths [--workspace <path>]
  aist doctor [--workspace <path>]
  aist daemon --workspace <path> [--socket <path>]
  aist chat new [--workspace <path>] [--model <model>] [--json]
  aist chat list [--workspace <path>] [--json]
  aist chat get <chatId> [--workspace <path>] [--json]
  aist chat clear <chatId> [--workspace <path>] [--json]
  aist chat set-model <chatId> <model> [--workspace <path>] [--json]
  aist chat ask <chatId> --prompt <text>|--stdin --workspace <path> --jsonl [--approval-mode ask|auto-readonly|auto-all|deny]
  aist config get [key] [--workspace <path>] [--json]
  aist config set <key> <value> --scope global|workspace [--workspace <path>] [--json]
  aist auth openrouter set-key [--from-env] [--json]
  aist auth openrouter status [--json]
  aist auth codex status [--json]
  aist models list [--provider openrouter|codex|all] [--json]
  aist models refresh [--provider openrouter|codex|all] [--json]
  aist autonomous list [--workspace <path>] [--json]
  aist autonomous flow start <flowId> [--workspace <path>] --jsonl [--engine <id>] [--dry-run|--no-dry-run] [--isolated] [--vcs-command git|arc]
  aist autonomous run start <runId> [--workspace <path>] --jsonl [--engine <id>] [--dry-run|--no-dry-run] [--isolated] [--vcs-command git|arc]
  aist autonomous stop <sessionId> [--workspace <path>] [--json]
  aist autonomous export <sessionId> [--workspace <path>] [--format markdown|json]

Commands:
  paths     Print workspace and global AIST paths.
  doctor    Check workspace and global AIST storage paths.
  daemon    Start the local-socket JSON-RPC backend for one workspace.
  chat      Create, list, inspect and update file-backed chats.
  config    Read or write non-secret CLI/backend settings.
  auth      Manage model provider auth status and global secrets.
  models    List model options from provider adapters or safe fallbacks.
  autonomous
            Inspect and run native autonomous flows and batch runs.

Options:
  --workspace <path>  Workspace root. Defaults to the current directory.
  --socket <path>     Override daemon local socket path.
  --model <model>     Model id for chat creation.
  --scope <scope>     Config write scope: global or workspace.
  --provider <name>   Model provider: openrouter, codex, or all.
  --engine <id>       Autonomous engine id: dry-run, openrouter-api, codex-api, claude-cli, or codex-cli.
  --format <format>   Export format: markdown or json.
  --approval-mode <mode>
                      Headless tool policy: ask, auto-readonly, auto-all, or deny.
  --dry-run           Force autonomous dry-run mode (default for autonomous start).
  --no-dry-run        Execute the selected autonomous engine instead of dry-run.
  --isolated          Run autonomous work in a git-like VCS worktree and branch.
  --vcs-command <cmd> Git-like VCS command for isolated runs: git by default, arc for Yandex VCS.
  --vcs-base-branch <branch>
                      Base branch for isolated autonomous worktree creation.
  --vcs-branch <name> Branch name for isolated autonomous work.
  --vcs-worktree <path>
                      Worktree path for isolated autonomous work.
  --keep-worktree     Keep the isolated worktree after autonomous run completion.
  --from-env          Read OPENROUTER_API_KEY instead of stdin for set-key.
  --json              Print machine-readable JSON.
  --jsonl             Print newline-delimited runtime events.
  --help, -h          Show this help.
  --version, -v       Show the package version.
`;
}

export function resolveCliPaths(
  options: Pick<RunCliOptions, 'cwd' | 'homeDir'> & { workspace?: string } = {}
): CliPaths {
  const cwd = options.cwd || process.cwd();
  const workspaceRoot = path.resolve(cwd, options.workspace || '.');
  const homeDir = options.homeDir || os.homedir();

  return {
    workspaceRoot,
    workspaceAistRoot: workspaceAistRoot(workspaceRoot),
    workspaceSettingsFile: workspaceSettingsFile(workspaceRoot),
    workspaceChatsDir: globalWorkspaceChatsDir(workspaceRoot, homeDir),
    workspaceRunsDir: globalWorkspaceRunsDir(workspaceRoot, homeDir),
    workspaceTelemetryDir: globalWorkspaceTelemetryDir(workspaceRoot, homeDir),
    workspaceToolsDir: workspaceToolsDir(workspaceRoot),
    globalAistRoot: globalAistRoot(homeDir),
    globalSettingsFile: globalSettingsFile(homeDir),
    globalMemoryFile: globalMemoryFile(homeDir),
    globalToolsDir: globalToolsDir(homeDir)
  };
}

export function formatPathsOutput(paths: CliPaths): string {
  return `AIST paths
Workspace root: ${paths.workspaceRoot}
Workspace AIST root: ${paths.workspaceAistRoot}
Workspace settings: ${paths.workspaceSettingsFile}
Personal chats: ${paths.workspaceChatsDir}
Personal runs: ${paths.workspaceRunsDir}
Personal telemetry: ${paths.workspaceTelemetryDir}
Workspace tools: ${paths.workspaceToolsDir}
Global AIST root: ${paths.globalAistRoot}
Global settings: ${paths.globalSettingsFile}
Global memory: ${paths.globalMemoryFile}
Global tools: ${paths.globalToolsDir}
`;
}

export async function runDoctor(
  options: Pick<RunCliOptions, 'cwd' | 'homeDir'> & { workspace?: string } = {}
): Promise<DoctorResult> {
  const paths = resolveCliPaths(options);
  const workspaceRootCheck = await checkDirectoryExists('workspace root', paths.workspaceRoot);
  const checks: DoctorCheck[] = [workspaceRootCheck];

  if (workspaceRootCheck.status === 'ok') {
    checks.push(await checkCreatableDirectory('workspace .aist-agent', paths.workspaceAistRoot));
  } else {
    checks.push({
      name: 'workspace .aist-agent',
      status: 'fail',
      message: `skipped because workspace root is unavailable: ${paths.workspaceAistRoot}`
    });
  }

  checks.push(await checkCreatableDirectory('global .aist-agent', paths.globalAistRoot));

  return {
    ok: checks.every((check) => check.status === 'ok'),
    paths: {
      workspaceRoot: paths.workspaceRoot,
      workspaceAistRoot: paths.workspaceAistRoot,
      globalAistRoot: paths.globalAistRoot
    },
    checks
  };
}

export function formatDoctorOutput(result: DoctorResult): string {
  const checkLines = result.checks
    .map((check) => `${check.status === 'ok' ? 'OK' : 'FAIL'} ${check.name}: ${check.message}`)
    .join('\n');

  return `AIST doctor
Workspace root: ${result.paths.workspaceRoot}
Workspace AIST root: ${result.paths.workspaceAistRoot}
Global AIST root: ${result.paths.globalAistRoot}

${checkLines}
`;
}

async function runDaemonCommand(
  command: Extract<CliCommand, { kind: 'daemon' }>,
  options: RunCliOptions,
  stderr: CliWriter
): Promise<number> {
  const paths = resolveCliPaths({ ...options, workspace: command.workspace });
  const server = new AistDaemonServer({
    workspaceRoot: paths.workspaceRoot,
    homeDir: options.homeDir,
    env: getCliEnv(options),
    socketPath: command.socket,
    fetch: options.fetch,
    modelClient: options.modelClient,
    toolRegistry: options.toolRegistry,
    filesystemToolRunner: options.filesystemToolRunner
  });

  await server.start();
  stderr(`${CLI_NAME} daemon listening on ${server.socketPath}\n`);

  return new Promise<number>((resolve) => {
    let shuttingDown = false;
    const shutdown = (signal: NodeJS.Signals) => {
      if (shuttingDown) {
        return;
      }

      shuttingDown = true;
      stderr(`${CLI_NAME} daemon shutting down after ${signal}.\n`);
      void server.close().finally(() => {
        process.off('SIGINT', shutdown);
        process.off('SIGTERM', shutdown);
        resolve(0);
      });
    };

    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  });
}

const OPENROUTER_ENV_KEY = 'OPENROUTER_API_KEY';
const REDACTED_VALUE = '<redacted>';

const silentLogger = {
  warn: (): void => {},
  info: (): void => {},
  error: (): void => {}
};

const unusedFetch: FetchLike = async () => {
  throw new Error('Unexpected network request while listing static model options.');
};

type ConfigValueSource = 'workspace' | 'global' | 'unset';

type ConfigGetResult =
  | {
      readonly key: string;
      readonly value: JsonValue | undefined;
      readonly source: ConfigValueSource;
      readonly redacted: boolean;
    }
  | {
      readonly values: JsonObject;
      readonly redacted: boolean;
    };

type ConfigSetResult = {
  readonly key: string;
  readonly value: JsonValue;
  readonly scope: ConfigScope;
  readonly redacted: boolean;
};

type AuthStatusResult = {
  readonly provider: ModelProvider;
  readonly authenticated: boolean;
  readonly source: 'env' | 'global-secret' | 'none';
};

type CodexAuthStatusResult = AuthStatusResult & {
  readonly login: 'vscode-extension';
};

type ModelsListResult = {
  readonly provider: CliModelProvider;
  readonly refreshed: boolean;
  readonly fallbackUsed: boolean;
  readonly errors: readonly string[];
  readonly models: readonly OpenRouterModelOption[];
};

type AutonomousStateCommandResult = {
  readonly workspaceRoot: string;
  readonly state: AutonomousState;
};

type AutonomousStopCommandResult = {
  readonly workspaceRoot: string;
  readonly sessionId: string;
  readonly stopped: boolean;
};

type AutonomousExportCommandResult = {
  readonly workspaceRoot: string;
  readonly sessionId: string;
  readonly format: AutonomousExportFormat;
  readonly content: string;
};

type ChatSummaryJson = {
  readonly id: string;
  readonly title: string;
  readonly model: string;
  readonly previousChatId: string | null;
  readonly compactedAt: number | null;
  readonly compactionModel: string | null;
  readonly messageCount: number;
  readonly lastUserMessage: string;
  readonly busy: boolean;
  readonly lastMessageAt: number;
  readonly updatedAt: number;
};

type ChatJson = {
  readonly id: string;
  readonly title: string;
  readonly model: string;
  readonly previousChatId: string | null;
  readonly compactedAt: number | null;
  readonly compactionModel: string | null;
  readonly messages: readonly ChatMessage[];
  readonly history: readonly JsonValue[];
  readonly lastAnswer: string;
  readonly busy: boolean;
  readonly activity: string | null;
  readonly activityDetail: string | null;
  readonly modelRequest: JsonValue | null;
  readonly context: JsonValue | null;
  readonly contextLength: number | null;
  readonly activePlan: JsonValue | null;
  readonly reflectionCandidates: JsonValue[];
  readonly usage: Chat['usage'];
  readonly createdAt: number;
  readonly updatedAt: number;
};

type ChatCommandResult = {
  readonly workspaceRoot: string;
  readonly chat: ChatJson;
  readonly summary: ChatSummaryJson;
};

type ChatListCommandResult = {
  readonly workspaceRoot: string;
  readonly chats: readonly ChatSummaryJson[];
};

async function createChatCommandResult(
  command: Extract<CliCommand, { kind: 'chatNew' }>,
  options: RunCliOptions
): Promise<ChatCommandResult> {
  const workspaceRoot = await resolveChatWorkspaceRoot(command.workspace, options);
  const repository = new ChatRepository({ workspaceRoot, homeDir: options.homeDir });
  const model = command.model || (await resolveChatModel(workspaceRoot, options));
  const chat = await repository.create({ model });
  return toChatCommandResult(workspaceRoot, chat);
}

async function listChatsCommandResult(
  command: Extract<CliCommand, { kind: 'chatList' }>,
  options: RunCliOptions
): Promise<ChatListCommandResult> {
  const workspaceRoot = await resolveChatWorkspaceRoot(command.workspace, options);
  const repository = new ChatRepository({ workspaceRoot, homeDir: options.homeDir });
  const chats = await repository.list();
  return {
    workspaceRoot,
    chats: chats.map(toChatSummaryJson)
  };
}

async function getChatCommandResult(
  command: Extract<CliCommand, { kind: 'chatGet' }>,
  options: RunCliOptions
): Promise<ChatCommandResult> {
  const workspaceRoot = await resolveChatWorkspaceRoot(command.workspace, options);
  const repository = new ChatRepository({ workspaceRoot, homeDir: options.homeDir });
  const chat = await requireChat(repository, command.chatId);
  return toChatCommandResult(workspaceRoot, chat);
}

async function clearChatCommandResult(
  command: Extract<CliCommand, { kind: 'chatClear' }>,
  options: RunCliOptions
): Promise<ChatCommandResult> {
  const workspaceRoot = await resolveChatWorkspaceRoot(command.workspace, options);
  const repository = new ChatRepository({ workspaceRoot, homeDir: options.homeDir });
  await requireChat(repository, command.chatId);
  const chat = await repository.clear(command.chatId);
  return toChatCommandResult(workspaceRoot, chat);
}

async function setChatModelCommandResult(
  command: Extract<CliCommand, { kind: 'chatSetModel' }>,
  options: RunCliOptions
): Promise<ChatCommandResult> {
  const workspaceRoot = await resolveChatWorkspaceRoot(command.workspace, options);
  const repository = new ChatRepository({ workspaceRoot, homeDir: options.homeDir });
  await requireChat(repository, command.chatId);
  const chat = await repository.update(command.chatId, { model: command.model });
  return toChatCommandResult(workspaceRoot, chat);
}

async function runChatAskCommand(
  command: Extract<CliCommand, { kind: 'chatAsk' }>,
  options: RunCliOptions,
  stdout: CliWriter,
  stderr: CliWriter
): Promise<number> {
  const workspaceRoot = await resolveChatWorkspaceRoot(command.workspace, options);
  const chatRepository = new ChatRepository({ workspaceRoot, homeDir: options.homeDir });
  const chat = await requireChat(chatRepository, command.chatId);
  if (chat.busy) {
    throw new CliCommandError('run.busy', `Chat already has an active run: ${chat.id}`, {
      details: { chatId: chat.id }
    });
  }

  const prompt = command.stdin ? await readStreamText(options.stdin || process.stdin) : command.prompt || '';
  if (!prompt.trim()) {
    throw new CliUsageError(`'chat ask' prompt is empty.`);
  }

  const configStore = new FileBackedConfigStore({ workspaceRoot, homeDir: options.homeDir, logger: silentLogger });
  const modelClient = options.modelClient || (await createHeadlessModelClient(chat.model, configStore, options));
  const runRepository = new RunRepository({ workspaceRoot, homeDir: options.homeDir });
  const toolRegistry = options.toolRegistry || new DefaultToolRegistry();
  const memoryStore = new AgentMemoryStore(createMemoryStorePaths({ workspaceRoot, homeDir: options.homeDir }));
  const runState: {
    approvalRequired?: {
      runId: string;
      chatId: string;
      approvalId: string;
      messageId: string;
      toolName: string;
    };
    runError?: Extract<RuntimeEvent, { type: 'run.error' }>;
  } = {};
  const writeEvent = (event: RuntimeEvent): void => {
    if (event.type === 'tool.call.approvalRequested' && command.approvalMode !== 'deny') {
      runState.approvalRequired = {
        runId: event.runId,
        chatId: event.chatId,
        approvalId: event.approvalId,
        messageId: event.messageId,
        toolName: event.toolCall.name
      };
    }
    if (event.type === 'run.error') {
      runState.runError = event;
    }
    stdout(`${JSON.stringify(event)}\n`);
  };

  const runtime = new AgentRuntimeService({
    chatRepository: createFileBackedRuntimeChatRepository(chatRepository),
    runRepository,
    modelClient,
    toolRegistry,
    handleToolCall: createHeadlessToolCallHandler({
      approvalMode: command.approvalMode,
      filesystem: options.filesystemToolRunner || {
        execute: createNodeFilesystemToolRunner({
          context: {
            workspaceRoot,
            workspaceName: path.basename(workspaceRoot)
          }
        })
      },
      memoryStore,
      toolRegistry,
      configStore,
      workspaceRoot
    }),
    configProvider: {
      getSnapshot: () => getHeadlessRuntimeConfig(configStore)
    },
    promptProvider: {
      getSystemPrompt: async () => {
        const skills = await getHeadlessConfiguredSkills(configStore);
        return buildFileAgentSystemPrompt({
          workspaceRoot,
          homeDir: options.homeDir,
          language: await getHeadlessLanguage(configStore),
          skills: skills.map(({ id, label, description }) => ({ id, label, description }))
        });
      }
    },
    contextProviders: {
      getRepoContextNote: (inputPrompt) => getRepoVerificationContextNote(workspaceRoot, inputPrompt),
      getMemoryContextBlock: (input) =>
        getRelevantMemoryPromptBlockBySubagent({
          selection: {
            prompt: input.prompt,
            chatHistory: input.chat.messages,
            memoryItems: memoryStore.list(),
            chatModel: input.chat.model,
            settings: { model: input.chat.model, reasoningEffort: input.chat.modelSettings.reasoningEffort }
          },
          modelClient
        })
    },
    modelCatalog: {
      getOption: getHeadlessModelOption
    },
    skillProvider: {
      getSkills: () => getHeadlessConfiguredSkills(configStore)
    },
    workspaceRootProvider: {
      getWorkspaceRoot: () => workspaceRoot
    },
    eventSink: {
      emit: writeEvent
    },
    logger: silentLogger,
    concurrencyScope: 'chat',
    reflection: {
      enabled: false
    }
  });

  const result = await runtime.ask(chat.id, prompt);
  if (!result.accepted) {
    throw new CliCommandError(result.error.code || 'run.rejected', result.error.message, {
      details: { chatId: chat.id }
    });
  }

  if (runState.approvalRequired) {
    stderr(
      `${CLI_NAME}: approval required for tool ${runState.approvalRequired.toolName} in run ${runState.approvalRequired.runId}; approval.resolve is not implemented in this MVP.\n`
    );
    return CLI_APPROVAL_REQUIRED_EXIT_CODE;
  }

  if (runState.runError) {
    stderr(`${CLI_NAME}: run failed: ${runState.runError.error.message}\n`);
    return 1;
  }

  return 0;
}

async function getAutonomousStateCommandResult(
  command: Extract<CliCommand, { kind: 'autonomousList' }>,
  options: RunCliOptions
): Promise<AutonomousStateCommandResult> {
  const backend = await createAutonomousBackend(command.workspace, options);
  try {
    return {
      workspaceRoot: backend.workspaceRoot,
      state: await backend.getState()
    };
  } finally {
    backend.dispose();
  }
}

async function runAutonomousStartCommand(
  command: Extract<CliCommand, { kind: 'autonomousFlowStart' | 'autonomousRunStart' }>,
  options: RunCliOptions,
  stdout: CliWriter
): Promise<number> {
  const backend = await createAutonomousBackend(command.workspace, options);
  const unsubscribe = backend.onEvent((event: AutonomousBackendEvent) => {
    stdout(`${JSON.stringify(event)}\n`);
  });

  try {
    const result =
      command.kind === 'autonomousFlowStart'
        ? await backend.startFlow(command.flowId, command.launch)
        : await backend.startRun(command.runId, command.launch);
    stdout(`${JSON.stringify({ type: 'autonomous.accepted', ...result })}\n`);
    const session = await backend.waitForSession(result.sessionId);
    stdout(`${JSON.stringify(toAutonomousCompletedEvent(session))}\n`);
    return session.meta.status === 'finished' ? 0 : 1;
  } finally {
    unsubscribe();
    backend.dispose();
  }
}

async function stopAutonomousSessionCommandResult(
  command: Extract<CliCommand, { kind: 'autonomousStop' }>,
  options: RunCliOptions
): Promise<AutonomousStopCommandResult> {
  const backend = await createAutonomousBackend(command.workspace, options);
  try {
    const daemonResult = await tryStopAutonomousSessionViaDaemon(backend.workspaceRoot, command.sessionId);
    if (daemonResult) {
      return {
        workspaceRoot: backend.workspaceRoot,
        sessionId: daemonResult.sessionId,
        stopped: daemonResult.stopped
      };
    }

    const result = backend.stop(command.sessionId);
    return {
      workspaceRoot: backend.workspaceRoot,
      sessionId: result.sessionId,
      stopped: result.stopped
    };
  } finally {
    backend.dispose();
  }
}

async function tryStopAutonomousSessionViaDaemon(
  workspaceRoot: string,
  sessionId: string
): Promise<DaemonAutonomousStopResult | undefined> {
  let client: DaemonJsonRpcClient | undefined;
  try {
    client = await DaemonJsonRpcClient.connect({ socketPath: getDaemonSocketPath(workspaceRoot) });
    return await client.request<DaemonAutonomousStopResult>('autonomous.stop', { sessionId });
  } catch {
    return undefined;
  } finally {
    client?.close();
  }
}

async function exportAutonomousSessionCommandResult(
  command: Extract<CliCommand, { kind: 'autonomousExport' }>,
  options: RunCliOptions
): Promise<AutonomousExportCommandResult> {
  const backend = await createAutonomousBackend(command.workspace, options);
  try {
    const result = await backend.exportSession(command.sessionId, command.format);
    return {
      workspaceRoot: backend.workspaceRoot,
      sessionId: result.sessionId,
      format: result.format,
      content: result.content
    };
  } finally {
    backend.dispose();
  }
}

async function createAutonomousBackend(
  workspace: string | undefined,
  options: RunCliOptions
): Promise<AutonomousBackend> {
  const workspaceRoot = await resolveCommandWorkspaceRoot(workspace, options);
  return new AutonomousBackend({
    workspaceRoot,
    workspaceName: path.basename(workspaceRoot),
    homeDir: options.homeDir,
    env: getCliEnv(options),
    fetch: options.fetch,
    modelClient: options.modelClient,
    logger: silentLogger
  });
}

function createFileBackedRuntimeChatRepository(repository: ChatRepository): AgentRuntimeChatRepository {
  const activePlans = new Map<string, Chat['activePlan']>();

  return {
    getChat: async (chatId) => {
      const chat = await repository.get(chatId);
      activePlans.set(chatId, chat?.activePlan);
      return chat;
    },
    appendMessage: (chatId, message) => repository.appendMessage(chatId, message),
    updateMessage: (chatId, messageId, patch) => repository.updateMessage(chatId, messageId, patch),
    setBusy: (chatId, busy) => repository.setBusy(chatId, busy),
    setActivity: (chatId, activity, detail) => repository.setActivity(chatId, activity, detail),
    setActivityDetail: (chatId, detail) => repository.setActivityDetail(chatId, detail),
    setModelRequest: (chatId, modelRequest) => repository.setModelRequest(chatId, modelRequest),
    updateModelRequest: (chatId, patch) => repository.updateModelRequest(chatId, patch),
    setHistory: (chatId, history) => repository.setHistory(chatId, history),
    setLastAnswer: (chatId, answer) => repository.setLastAnswer(chatId, answer),
    addUsage: (chatId, usage) => repository.addUsage(chatId, usage),
    setContext: (chatId, context) => repository.setContext(chatId, context),
    getActivePlan: (chatId) => activePlans.get(chatId),
    setActivePlan: async (chatId, activePlan) => {
      activePlans.set(chatId, activePlan);
      await repository.setActivePlan(chatId, activePlan);
    },
    addReflectionCandidates: (chatId, candidates) => repository.addReflectionCandidates(chatId, candidates)
  };
}

function createHeadlessToolCallHandler(input: {
  approvalMode: CliApprovalMode;
  filesystem: ToolRunnerExecutionAdapter;
  memoryStore: AgentMemoryStore;
  toolRegistry: ToolRegistry;
  configStore: FileBackedConfigStore;
  workspaceRoot: string;
}): AgentRuntimeToolCallHandler {
  return async (params) => {
    const runner = new ToolRunner({
      registry: input.toolRegistry,
      context: params.context,
      approvalService: {
        getPermission: (toolName) =>
          getHeadlessToolPermission({
            approvalMode: input.approvalMode,
            toolName,
            tools: getHeadlessPermissionToolMetadata(input.toolRegistry)
          }),
        requestApproval: async (request) => {
          if (input.approvalMode === 'deny') {
            return {
              approved: false,
              continueAfterDeny: true,
              comment: 'Denied by CLI approval policy.'
            } satisfies ToolApprovalDecision;
          }

          return {
            approved: false,
            continueAfterDeny: false,
            comment: 'Tool approval is required in headless ask mode.'
          } satisfies ToolApprovalDecision;
        }
      },
      filesystem: input.filesystem,
      projectTools: {
        execute: (toolName, args) => input.toolRegistry.runProjectTool(toolName, args, input.workspaceRoot)
      },
      skills: {
        execute: async (_toolName, args) =>
          runNodeSkillTool({
            skills: await getHeadlessConfiguredSkills(input.configStore),
            workspaceRoot: input.workspaceRoot,
            args
          })
      },
      memory: {
        add: (candidate) => input.memoryStore.add(candidate)
      },
      events: params.events,
      runRepository: params.runRepository,
      workspaceRoot: input.workspaceRoot,
      getRunId: () => params.runId
    });
    await runner.handleToolCall(params);
  };
}

/**
 * Что это: собирает permission metadata из актуального registry snapshot.
 * Зачем нужно: headless CLI применяет общие пресеты к тому же набору tools, который видит модель.
 */
function getHeadlessPermissionToolMetadata(
  toolRegistry: ToolRegistry
): Array<{ name: string; defaultPermission: ToolPermissionMode }> {
  const snapshot = toolRegistry.snapshot();
  const projectDefaults = new Map(snapshot.projectTools.map((tool) => [tool.id, tool.permission]));

  return snapshot.tools.map((tool) => ({
    name: tool.function.name,
    defaultPermission: projectDefaults.get(tool.function.name) || 'ask'
  }));
}

async function createHeadlessModelClient(
  model: string,
  configStore: FileBackedConfigStore,
  options: RunCliOptions
): Promise<ModelClient> {
  if (model.startsWith('codex:')) {
    const secretStore = new FileSecretStore({ homeDir: options.homeDir, logger: silentLogger });
    const authProvider = new CodexAuthSessionProvider(secretStore, { fetch: options.fetch, logger: silentLogger });
    if (!(await authProvider.isAuthenticated())) {
      throw new CliCommandError(
        'auth.codex.missing',
        'ChatGPT Codex auth is not configured. Login through the VS Code extension before using codex:* models.',
        { details: { model } }
      );
    }

    return new CodexResponsesTransport({
      tokenProvider: authProvider,
      fetch: options.fetch,
      logger: silentLogger,
      defaultModel: model,
      serviceTier: await getHeadlessCodexServiceTier(configStore)
    });
  }

  const apiKey = await getOpenRouterApiKey(options);
  if (!apiKey) {
    throw new CliCommandError(
      'auth.openrouter.missing',
      `OpenRouter API key is not configured. Run '${CLI_NAME} auth openrouter set-key' or set ${OPENROUTER_ENV_KEY}.`,
      { details: { model } }
    );
  }

  return new OpenRouterTransport({
    apiKey,
    fetch: options.fetch,
    logger: silentLogger,
    siteUrl: await getStringSetting(configStore, ['openrouterAgent.siteUrl', 'siteUrl']),
    siteName: (await getStringSetting(configStore, ['openrouterAgent.siteName', 'siteName'])) || CLI_NAME,
    reasoningEffort: await getHeadlessReasoningEffort(configStore)
  });
}

async function getHeadlessRuntimeConfig(configStore: FileBackedConfigStore): Promise<AgentRuntimeConfigSnapshot> {
  return {
    maxToolIterations: Math.max(
      0,
      Math.floor(await getNumberSetting(configStore, ['openrouterAgent.maxToolIterations', 'maxToolIterations'], 0))
    ),
    streamingEnabled: await getBooleanSetting(
      configStore,
      ['openrouterAgent.streamingEnabled', 'streamingEnabled'],
      false
    ),
    disabledProjectToolIds: await getStringArraySetting(configStore, [
      'openrouterAgent.projectToolDisabledIds',
      'projectToolDisabledIds'
    ])
  };
}

async function getHeadlessLanguage(configStore: FileBackedConfigStore): Promise<AgentLanguage> {
  const language = await getStringSetting(configStore, ['openrouterAgent.language', 'language']);
  return language === 'ru' ? 'ru' : 'en';
}

async function getHeadlessReasoningEffort(configStore: FileBackedConfigStore): Promise<ReasoningEffort> {
  const value = await getStringSetting(configStore, ['openrouterAgent.reasoningEffort', 'reasoningEffort']);
  return value === 'low' || value === 'medium' || value === 'high' || value === 'xhigh' ? value : 'auto';
}

async function getHeadlessCodexServiceTier(configStore: FileBackedConfigStore): Promise<CodexServiceTier> {
  const value = await getStringSetting(configStore, ['openrouterAgent.codexServiceTier', 'codexServiceTier']);
  return value === 'priority' ? 'priority' : 'auto';
}

async function getHeadlessConfiguredSkills(configStore: FileBackedConfigStore): Promise<readonly AgentSkill[]> {
  const value = await getFirstConfigSetting(configStore, ['openrouterAgent.customSkills', 'customSkills']);
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => normalizeHeadlessSkill(item)).filter((skill): skill is AgentSkill => Boolean(skill));
}

function normalizeHeadlessSkill(value: unknown): AgentSkill | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  const label = typeof record.label === 'string' ? record.label.trim() : '';
  const command = typeof record.command === 'string' ? record.command.trim() : '';
  if (!id || !label || !command) {
    return undefined;
  }

  return {
    id,
    label,
    command,
    permission: record.permission === 'auto' ? 'auto' : 'ask',
    description: typeof record.description === 'string' ? record.description.trim() : '',
    scope: typeof record.scope === 'string' ? record.scope : undefined
  };
}

function getHeadlessModelOption(modelId: string): OpenRouterModelOption {
  const known = FALLBACK_MODEL_OPTIONS.find((model) => model.id === modelId);
  if (known) {
    return known;
  }

  return {
    id: modelId,
    name: modelId,
    provider: modelId.startsWith('codex:') ? 'codex' : 'openrouter',
    supportsTools: true
  };
}

async function getStringSetting(
  configStore: FileBackedConfigStore,
  keys: readonly string[]
): Promise<string | undefined> {
  const value = await getFirstConfigSetting(configStore, keys);
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

async function getNumberSetting(
  configStore: FileBackedConfigStore,
  keys: readonly string[],
  fallback: number
): Promise<number> {
  const value = await getFirstConfigSetting(configStore, keys);
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

async function getBooleanSetting(
  configStore: FileBackedConfigStore,
  keys: readonly string[],
  fallback: boolean
): Promise<boolean> {
  const value = await getFirstConfigSetting(configStore, keys);
  return typeof value === 'boolean' ? value : fallback;
}

async function getStringArraySetting(
  configStore: FileBackedConfigStore,
  keys: readonly string[]
): Promise<readonly string[]> {
  const value = await getFirstConfigSetting(configStore, keys);
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

async function getFirstConfigSetting(
  configStore: FileBackedConfigStore,
  keys: readonly string[]
): Promise<JsonValue | undefined> {
  for (const key of keys) {
    const value = await configStore.get<JsonValue>(key);
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

async function resolveChatWorkspaceRoot(workspace: string | undefined, options: RunCliOptions): Promise<string> {
  return resolveCommandWorkspaceRoot(workspace, options);
}

async function resolveCommandWorkspaceRoot(workspace: string | undefined, options: RunCliOptions): Promise<string> {
  const paths = resolveCliPaths({ ...options, workspace });

  try {
    const stat = await fs.promises.stat(paths.workspaceRoot);
    if (!stat.isDirectory()) {
      throw new CliCommandError('workspace.invalid', `Workspace path is not a directory: ${paths.workspaceRoot}`, {
        details: { workspaceRoot: paths.workspaceRoot }
      });
    }

    return paths.workspaceRoot;
  } catch (error) {
    if (error instanceof CliCommandError) {
      throw error;
    }

    throw new CliCommandError('workspace.invalid', `Workspace path is not accessible: ${paths.workspaceRoot}`, {
      details: { workspaceRoot: paths.workspaceRoot }
    });
  }
}

async function resolveChatModel(workspaceRoot: string, options: RunCliOptions): Promise<string> {
  const store = new FileBackedConfigStore({ workspaceRoot, homeDir: options.homeDir, logger: silentLogger });
  const configuredModel = await store.get<JsonValue>('model', DEFAULT_MODEL);
  return typeof configuredModel === 'string' && configuredModel.trim() ? configuredModel : DEFAULT_MODEL;
}

async function requireChat(repository: ChatRepository, chatId: string): Promise<Chat> {
  const chat = await repository.get(chatId);
  if (!chat) {
    throw new CliCommandError('chat.notFound', `Chat not found: ${chatId}`, { details: { chatId } });
  }

  return chat;
}

function toChatCommandResult(workspaceRoot: string, chat: Chat): ChatCommandResult {
  return {
    workspaceRoot,
    chat: toChatJson(chat),
    summary: toChatSummaryJson(toChatSummary(chat))
  };
}

function formatChatNewOutput(result: ChatCommandResult, json: boolean): string {
  if (json) {
    return formatJsonOutput({ workspaceRoot: result.workspaceRoot, chat: result.chat });
  }

  return `Created chat ${result.chat.id}
Workspace: ${result.workspaceRoot}
Model: ${result.chat.model}
`;
}

function formatChatListOutput(result: ChatListCommandResult, json: boolean): string {
  if (json) {
    return formatJsonOutput(result);
  }

  if (result.chats.length === 0) {
    return `AIST chats
Workspace: ${result.workspaceRoot}
(no chats)
`;
  }

  const lines = result.chats.map((chat) => {
    const updatedAt = formatTimestamp(chat.updatedAt);
    return `- ${chat.id}  ${chat.title}  [${chat.model}]  messages: ${chat.messageCount}  updated: ${updatedAt}`;
  });
  return `AIST chats
Workspace: ${result.workspaceRoot}
${lines.join('\n')}
`;
}

function formatChatGetOutput(result: ChatCommandResult, json: boolean): string {
  if (json) {
    return formatJsonOutput({ workspaceRoot: result.workspaceRoot, chat: result.chat });
  }

  const messages =
    result.chat.messages.length === 0
      ? '(no messages)'
      : result.chat.messages.map((message) => formatChatMessageLine(message)).join('\n');
  return `AIST chat ${result.chat.id}
Workspace: ${result.workspaceRoot}
Title: ${result.chat.title}
Model: ${result.chat.model}
Messages: ${result.summary.messageCount}
Updated: ${formatTimestamp(result.chat.updatedAt)}

${messages}
`;
}

function formatChatClearOutput(result: ChatCommandResult, json: boolean): string {
  if (json) {
    return formatJsonOutput({ workspaceRoot: result.workspaceRoot, cleared: true, chat: result.chat });
  }

  return `Cleared chat ${result.chat.id}.\n`;
}

function formatChatSetModelOutput(result: ChatCommandResult, json: boolean): string {
  if (json) {
    return formatJsonOutput({ workspaceRoot: result.workspaceRoot, chat: result.chat });
  }

  return `Set chat ${result.chat.id} model to ${result.chat.model}.\n`;
}

function formatAutonomousListOutput(result: AutonomousStateCommandResult, json: boolean): string {
  if (json) {
    return formatJsonOutput(result);
  }

  const flowLines = result.state.definitions.flows.map(
    (flow) => `- ${flow.id}  stages: ${flow.stages.length}  source: ${flow.sourceKind}`
  );
  const runLines = result.state.definitions.runs.map(
    (run) => `- ${run.id}  tasks: ${run.tasks.length}  repeat: ${run.repeat}  source: ${run.sourceKind}`
  );
  const sessionLines = result.state.sessions.map(
    (session) => `- ${session.meta.id}  ${session.meta.kind}:${session.meta.targetId || '-'}  ${session.meta.status}`
  );

  return `AIST autonomous
Workspace: ${result.workspaceRoot}
Storage: ${result.state.storageRoot}

Flows (${result.state.definitions.flows.length})
${flowLines.length ? flowLines.join('\n') : '(none)'}

Runs (${result.state.definitions.runs.length})
${runLines.length ? runLines.join('\n') : '(none)'}

Sessions (${result.state.sessions.length})
${sessionLines.length ? sessionLines.join('\n') : '(none)'}
`;
}

function formatAutonomousStopOutput(result: AutonomousStopCommandResult, json: boolean): string {
  if (json) {
    return formatJsonOutput(result);
  }

  return result.stopped
    ? `Stopped autonomous session ${result.sessionId}.\n`
    : `Autonomous session ${result.sessionId} was not running.\n`;
}

function toAutonomousCompletedEvent(session: AutonomousSessionView): Record<string, unknown> {
  return {
    type: 'autonomous.completed',
    sessionId: session.meta.id,
    kind: session.meta.kind,
    targetId: session.meta.targetId,
    status: session.meta.status,
    error: session.meta.error
  };
}

function toChatJson(chat: Chat): ChatJson {
  return {
    id: chat.id,
    title: chat.title,
    model: chat.model,
    previousChatId: chat.previousChatId ?? null,
    compactedAt: chat.compactedAt ?? null,
    compactionModel: chat.compactionModel ?? null,
    messages: chat.messages,
    history: chat.history as JsonValue[],
    lastAnswer: chat.lastAnswer,
    busy: chat.busy,
    activity: chat.activity ?? null,
    activityDetail: chat.activityDetail ?? null,
    modelRequest: (chat.modelRequest as JsonValue | undefined) ?? null,
    context: (chat.context as JsonValue | undefined) ?? null,
    contextLength: chat.contextLength ?? null,
    activePlan: (chat.activePlan as JsonValue | undefined) ?? null,
    reflectionCandidates: (chat.reflectionCandidates as JsonValue[] | undefined) ?? [],
    usage: chat.usage,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt
  };
}

function toChatSummaryJson(summary: ChatSummary): ChatSummaryJson {
  return {
    id: summary.id,
    title: summary.title,
    model: summary.model,
    previousChatId: summary.previousChatId ?? null,
    compactedAt: summary.compactedAt ?? null,
    compactionModel: summary.compactionModel ?? null,
    messageCount: summary.messageCount,
    lastUserMessage: summary.lastUserMessage,
    busy: summary.busy,
    lastMessageAt: summary.lastMessageAt,
    updatedAt: summary.updatedAt
  };
}

function toChatSummary(chat: Chat): ChatSummary {
  const userAssistantMessages = chat.messages.filter(
    (message) => message.role === 'user' || message.role === 'assistant'
  );
  const lastUserMessage = [...chat.messages]
    .reverse()
    .find((message) => message.role === 'user' && message.content?.trim());

  return {
    id: chat.id,
    title: getCliChatTitle(chat),
    model: chat.model,
    modelSettings: chat.modelSettings,
    previousChatId: chat.previousChatId,
    compactedAt: chat.compactedAt,
    compactionModel: chat.compactionModel,
    messageCount: userAssistantMessages.length,
    lastUserMessage: lastUserMessage ? toSingleLinePreview(lastUserMessage.content || '', 50) : '',
    busy: chat.busy,
    lastMessageAt: chat.messages.at(-1)?.createdAt || chat.createdAt,
    updatedAt: chat.updatedAt
  };
}

function getCliChatTitle(chat: Chat): string {
  const firstUserMessage = chat.messages.find((message) => message.role === 'user' && message.content?.trim());
  return firstUserMessage ? toSingleLinePreview(firstUserMessage.content || '', 50) || chat.title : chat.title;
}

function formatChatMessageLine(message: ChatMessage): string {
  const content = message.content ? ` ${toSingleLinePreview(message.content, 120)}` : '';
  return `[${formatTimestamp(message.createdAt)}] ${message.role}:${content}`;
}

function toSingleLinePreview(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function formatTimestamp(value: number): string {
  return new Date(value).toISOString();
}

async function getConfigCommandResult(
  command: Extract<CliCommand, { kind: 'configGet' }>,
  options: RunCliOptions
): Promise<ConfigGetResult> {
  const paths = resolveCliPaths({ ...options, workspace: command.workspace });
  const globalSettings = await readOptionalJsonObject(paths.globalSettingsFile);
  const workspaceSettings = await readOptionalJsonObject(paths.workspaceSettingsFile);

  if (command.key) {
    const workspaceValue = getJsonPath(workspaceSettings, command.key);
    const globalValue = getJsonPath(globalSettings, command.key);
    const value = workspaceValue !== undefined ? workspaceValue : globalValue;
    const source: ConfigValueSource =
      workspaceValue !== undefined ? 'workspace' : globalValue !== undefined ? 'global' : 'unset';
    const redacted = redactConfigValue(command.key, value);
    return {
      key: command.key,
      value: redacted.value,
      source,
      redacted: redacted.redacted
    };
  }

  const merged = mergeJsonObjects(globalSettings, workspaceSettings);
  const redacted = redactConfigValue('', merged);
  return {
    values: asJsonObject(redacted.value),
    redacted: redacted.redacted
  };
}

async function setConfigCommandResult(
  command: Extract<CliCommand, { kind: 'configSet' }>,
  options: RunCliOptions
): Promise<ConfigSetResult> {
  if (containsSecretLikePath(command.key, command.value)) {
    throw new CliUsageError(
      `Refusing to write secret-like config key '${command.key}'. Use '${CLI_NAME} auth openrouter set-key' for API keys.`
    );
  }

  const paths = resolveCliPaths({ ...options, workspace: command.workspace });
  const store = new FileBackedConfigStore({
    workspaceRoot: paths.workspaceRoot,
    homeDir: options.homeDir,
    logger: silentLogger
  });
  await store.set(command.key, command.value, { scope: command.scope });

  const redacted = redactConfigValue(command.key, command.value);
  return {
    key: command.key,
    value: redacted.value ?? null,
    scope: command.scope,
    redacted: redacted.redacted
  };
}

function formatConfigGetOutput(result: ConfigGetResult, json: boolean): string {
  if (json) {
    if ('key' in result) {
      return formatJsonOutput({
        key: result.key,
        value: result.value === undefined ? null : result.value,
        source: result.source,
        redacted: result.redacted
      });
    }

    return formatJsonOutput({
      values: result.values,
      redacted: result.redacted
    });
  }

  if ('key' in result) {
    return `${result.key}: ${result.value === undefined ? '<unset>' : formatJsonValueForText(result.value)}\n`;
  }

  const lines = flattenJsonObject(result.values);
  if (lines.length === 0) {
    return 'AIST config\n(no settings)\n';
  }

  return `AIST config\n${lines.join('\n')}\n`;
}

function formatConfigSetOutput(result: ConfigSetResult, json: boolean): string {
  if (json) {
    return formatJsonOutput(result);
  }

  return `Set ${result.key} in ${result.scope} config.\n`;
}

async function setOpenRouterKey(
  command: Extract<CliCommand, { kind: 'authOpenRouterSetKey' }>,
  options: RunCliOptions,
  stderr: CliWriter
): Promise<AuthStatusResult> {
  const env = getCliEnv(options);
  const rawKey = command.fromEnv ? env[OPENROUTER_ENV_KEY] : await readOpenRouterKeyFromStdin(options, stderr);
  const apiKey = rawKey?.trim();

  if (!apiKey) {
    throw new Error(
      command.fromEnv ? `${OPENROUTER_ENV_KEY} is not set.` : `No OpenRouter API key was provided on stdin.`
    );
  }

  // Secrets are global-only so workspace settings can be committed without leaking credentials.
  const secretStore = new FileSecretStore({ homeDir: options.homeDir, logger: silentLogger });
  await secretStore.store(OPENROUTER_API_KEY_SECRET_KEY, apiKey);

  return {
    provider: 'openrouter',
    authenticated: true,
    source: 'global-secret'
  };
}

async function getOpenRouterAuthStatus(options: RunCliOptions): Promise<AuthStatusResult> {
  const env = getCliEnv(options);
  if (env[OPENROUTER_ENV_KEY]) {
    return {
      provider: 'openrouter',
      authenticated: true,
      source: 'env'
    };
  }

  const secretStore = new FileSecretStore({ homeDir: options.homeDir, logger: silentLogger });
  const secret = await secretStore.get(OPENROUTER_API_KEY_SECRET_KEY);
  return {
    provider: 'openrouter',
    authenticated: Boolean(secret),
    source: secret ? 'global-secret' : 'none'
  };
}

async function getCodexAuthStatus(options: RunCliOptions): Promise<CodexAuthStatusResult> {
  const secretStore = new FileSecretStore({ homeDir: options.homeDir, logger: silentLogger });
  const authProvider = new CodexAuthSessionProvider(secretStore, { fetch: options.fetch, logger: silentLogger });
  const authenticated = await authProvider.isAuthenticated();

  return {
    provider: 'codex',
    authenticated,
    source: authenticated ? 'global-secret' : 'none',
    login: 'vscode-extension'
  };
}

function formatOpenRouterAuthStatusOutput(result: AuthStatusResult, json: boolean): string {
  if (json) {
    return formatJsonOutput(result);
  }

  if (result.authenticated) {
    return `OpenRouter auth: configured (${formatAuthSource(result.source)}).\n`;
  }

  return `OpenRouter auth: not configured.\n`;
}

function formatCodexAuthStatusOutput(result: CodexAuthStatusResult, json: boolean): string {
  if (json) {
    return formatJsonOutput(result);
  }

  if (result.authenticated) {
    return `ChatGPT Codex auth: configured (${formatAuthSource(result.source)}).\n`;
  }

  return `ChatGPT Codex auth: not configured. Login is currently managed by the VS Code extension.\n`;
}

async function getModelsList(
  provider: CliModelProvider,
  options: RunCliOptions,
  refreshed: boolean
): Promise<ModelsListResult> {
  const providers: ModelProvider[] = provider === 'all' ? ['openrouter', 'codex'] : [provider];
  const models: OpenRouterModelOption[] = [];
  const errors: string[] = [];
  let fallbackUsed = false;

  if (providers.includes('openrouter')) {
    const openRouterModels = await loadOpenRouterModels(options).catch((error: unknown) => {
      fallbackUsed = true;
      errors.push(formatError(error));
      return fallbackModels('openrouter');
    });
    if (openRouterModels.fallback) {
      fallbackUsed = true;
    }
    models.push(...openRouterModels.models);
  }

  if (providers.includes('codex')) {
    const transport = new CodexResponsesTransport({
      tokenProvider: { getToken: async () => ({ accessToken: '' }) },
      fetch: options.fetch || unusedFetch,
      logger: silentLogger
    });
    models.push(...transport.listModels());
  }

  return {
    provider,
    refreshed,
    fallbackUsed,
    errors,
    models: dedupeAndSortModels(models)
  };
}

async function loadOpenRouterModels(
  options: RunCliOptions
): Promise<{ readonly fallback: boolean; readonly models: readonly OpenRouterModelOption[] }> {
  const auth = await getOpenRouterAuthStatus(options);
  if (!auth.authenticated) {
    return fallbackModels('openrouter');
  }

  const transport = new OpenRouterTransport({
    apiKey: await getOpenRouterApiKey(options),
    fetch: options.fetch,
    logger: silentLogger
  });
  return {
    fallback: false,
    models: await transport.listModels()
  };
}

function fallbackModels(provider: ModelProvider): {
  readonly fallback: true;
  readonly models: readonly OpenRouterModelOption[];
} {
  return {
    fallback: true,
    models: FALLBACK_MODEL_OPTIONS.filter((model) => model.provider === provider)
  };
}

async function getOpenRouterApiKey(options: RunCliOptions): Promise<string | undefined> {
  const env = getCliEnv(options);
  if (env[OPENROUTER_ENV_KEY]) {
    return env[OPENROUTER_ENV_KEY];
  }

  const secretStore = new FileSecretStore({ homeDir: options.homeDir, logger: silentLogger });
  return secretStore.get(OPENROUTER_API_KEY_SECRET_KEY);
}

function formatModelsListOutput(result: ModelsListResult, json: boolean): string {
  if (json) {
    return formatJsonOutput(result);
  }

  const title = result.refreshed ? 'AIST models refreshed' : 'AIST models';
  const note = result.fallbackUsed ? 'Using fallback models for unavailable providers.\n' : '';
  const lines = result.models.map((model) => formatModelLine(model));

  return `${title}\n${note}${lines.length ? lines.join('\n') : '(no models)'}\n`;
}

function formatModelLine(model: OpenRouterModelOption): string {
  const context = model.contextLength === undefined ? 'context unknown' : `context ${model.contextLength}`;
  const tools = model.supportsTools ? 'tools' : 'no tools';
  return `- [${model.provider}] ${model.id} - ${model.name} (${tools}, ${context})`;
}

async function readOpenRouterKeyFromStdin(options: RunCliOptions, stderr: CliWriter): Promise<string> {
  const stdin = options.stdin || process.stdin;
  if ('isTTY' in stdin && stdin.isTTY) {
    stderr('Enter OpenRouter API key, then press Enter:\n');
  }

  return readStreamText(stdin);
}

function readStreamText(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = [];
    stream.on('data', (chunk: unknown) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk));
    });
    stream.on('error', reject);
    stream.on('end', () => resolve(chunks.join('')));
  });
}

async function readOptionalJsonObject(filePath: string): Promise<JsonObject> {
  try {
    const parsed = JSON.parse(await fs.promises.readFile(filePath, 'utf8')) as unknown;
    return isJsonObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function mergeJsonObjects(base: JsonObject, override: JsonObject): JsonObject {
  const result: JsonObject = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const current = result[key];
    if (isJsonObject(current) && isJsonObject(value)) {
      result[key] = mergeJsonObjects(current, value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

function getJsonPath(settings: JsonObject, key: string): JsonValue | undefined {
  if (Object.prototype.hasOwnProperty.call(settings, key)) {
    return settings[key];
  }

  const segments = key.split('.');
  let current: JsonValue | undefined = settings;

  for (const segment of segments) {
    if (!isJsonObject(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

function redactConfigValue(
  key: string,
  value: JsonValue | undefined
): { readonly value: JsonValue | undefined; readonly redacted: boolean } {
  if (value === undefined) {
    return { value, redacted: false };
  }

  if (isSecretLikeConfigPath(key)) {
    return { value: REDACTED_VALUE, redacted: true };
  }

  if (Array.isArray(value)) {
    let redacted = false;
    const items = value.map((item) => {
      const result = redactConfigValue(key, item);
      redacted = redacted || result.redacted;
      return result.value ?? null;
    });
    return { value: items, redacted };
  }

  if (isJsonObject(value)) {
    let redacted = false;
    const result: JsonObject = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      if (childValue === undefined) {
        continue;
      }

      const pathKey = key ? `${key}.${childKey}` : childKey;
      const child = redactConfigValue(pathKey, childValue);
      redacted = redacted || child.redacted;
      result[childKey] = child.value;
    }
    return { value: result, redacted };
  }

  return { value, redacted: false };
}

function containsSecretLikePath(key: string, value: JsonValue): boolean {
  if (isSecretLikeConfigPath(key)) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsSecretLikePath(key, item));
  }

  if (isJsonObject(value)) {
    return Object.entries(value).some(([childKey, childValue]) =>
      childValue === undefined ? false : containsSecretLikePath(`${key}.${childKey}`, childValue)
    );
  }

  return false;
}

function isSecretLikeConfigPath(key: string): boolean {
  if (!key) {
    return false;
  }

  return /(^|[._-])(api[_-]?key|apikey|token|secret|password|oauth)($|[._-])/i.test(key);
}

function flattenJsonObject(value: JsonObject, prefix = ''): string[] {
  const lines: string[] = [];

  for (const [key, childValue] of Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) {
    if (childValue === undefined) {
      continue;
    }

    const pathKey = prefix ? `${prefix}.${key}` : key;
    if (isJsonObject(childValue) && Object.keys(childValue).length > 0) {
      lines.push(...flattenJsonObject(childValue, pathKey));
    } else {
      lines.push(`${pathKey}: ${formatJsonValueForText(childValue)}`);
    }
  }

  return lines;
}

function formatJsonValueForText(value: JsonValue): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function asJsonObject(value: JsonValue | undefined): JsonObject {
  return isJsonObject(value) ? value : {};
}

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function dedupeAndSortModels(models: readonly OpenRouterModelOption[]): OpenRouterModelOption[] {
  const byId = new Map<string, OpenRouterModelOption>();
  for (const model of models) {
    byId.set(model.id, model);
  }

  return [...byId.values()].sort((left, right) => {
    const providerOrder = left.provider.localeCompare(right.provider);
    return providerOrder === 0 ? left.name.localeCompare(right.name) : providerOrder;
  });
}

function getCliEnv(options: RunCliOptions): Record<string, string | undefined> {
  return options.env || process.env;
}

function formatAuthSource(source: AuthStatusResult['source']): string {
  if (source === 'env') {
    return OPENROUTER_ENV_KEY;
  }

  if (source === 'global-secret') {
    return 'global secret store';
  }

  return 'none';
}

function formatJsonOutput(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function formatCliErrorJson(error: unknown, message: string): string {
  return formatJsonOutput({
    error: {
      message,
      ...(error instanceof CliUsageError ? { code: 'cli.usage', exitCode: error.exitCode } : {}),
      ...(error instanceof CliCommandError
        ? { code: error.code, exitCode: error.exitCode, ...(error.details ? { details: error.details } : {}) }
        : {}),
      ...(!isCliKnownError(error) && hasErrorCode(error) ? { code: error.code } : {})
    }
  });
}

function isCliKnownError(error: unknown): error is CliUsageError | CliCommandError {
  return error instanceof CliUsageError || error instanceof CliCommandError;
}

function hasErrorCode(error: unknown): error is { code: string } {
  return Boolean(error && typeof error === 'object' && 'code' in error && typeof error.code === 'string');
}

type WorkspaceOptions = {
  readonly workspace?: string;
  readonly showHelp: boolean;
};

function parseDaemonCommand(args: readonly string[]): CliCommand {
  let workspace: string | undefined;
  let socket: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--help' || token === '-h') {
      assertNoExtraArgs(args.slice(index + 1), token);
      return { kind: 'help' };
    }

    const workspaceResult = parseWorkspaceOptionToken('daemon', args, index, workspace);
    if (workspaceResult.matched) {
      workspace = workspaceResult.workspace;
      index = workspaceResult.index;
      continue;
    }

    const socketResult = parseSocketOptionToken('daemon', args, index, socket);
    if (socketResult.matched) {
      socket = socketResult.socket;
      index = socketResult.index;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for 'daemon': ${token}`);
    }

    throw new CliUsageError(`Unexpected argument for 'daemon': ${token}`);
  }

  if (!workspace) {
    throw new CliUsageError(`'daemon' requires --workspace <path>.`);
  }

  return { kind: 'daemon', workspace, socket };
}

function parseChatCommand(args: readonly string[]): CliCommand {
  const [subcommand, ...rest] = args;
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    assertNoExtraArgs(rest, subcommand || 'chat');
    return { kind: 'help' };
  }

  if (subcommand === 'new') {
    return parseChatNewCommand(rest);
  }

  if (subcommand === 'list') {
    return parseChatListCommand(rest);
  }

  if (subcommand === 'get') {
    return parseChatGetCommand(rest);
  }

  if (subcommand === 'clear') {
    return parseChatClearCommand(rest);
  }

  if (subcommand === 'set-model') {
    return parseChatSetModelCommand(rest);
  }

  if (subcommand === 'ask') {
    return parseChatAskCommand(rest);
  }

  if (subcommand.startsWith('-')) {
    throw new CliUsageError(`Unknown option for 'chat': ${subcommand}`);
  }

  throw new CliUsageError(`Unknown chat command: ${subcommand}`);
}

function parseChatNewCommand(args: readonly string[]): CliCommand {
  let workspace: string | undefined;
  let model: string | undefined;
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--help' || token === '-h') {
      assertNoExtraArgs(args.slice(index + 1), token);
      return { kind: 'help' };
    }

    if (token === '--json') {
      json = true;
      continue;
    }

    const workspaceResult = parseWorkspaceOptionToken('chat new', args, index, workspace);
    if (workspaceResult.matched) {
      workspace = workspaceResult.workspace;
      index = workspaceResult.index;
      continue;
    }

    const modelResult = parseModelOptionToken('chat new', args, index, model);
    if (modelResult.matched) {
      model = modelResult.model;
      index = modelResult.index;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for 'chat new': ${token}`);
    }

    throw new CliUsageError(`Unexpected argument for 'chat new': ${token}`);
  }

  return { kind: 'chatNew', workspace, model, json };
}

function parseChatListCommand(args: readonly string[]): CliCommand {
  const options = parseChatWorkspaceJsonOptions('chat list', args);
  if (options.showHelp) {
    return { kind: 'help' };
  }

  return { kind: 'chatList', workspace: options.workspace, json: options.json };
}

function parseChatGetCommand(args: readonly string[]): CliCommand {
  const parsed = parseChatIdWorkspaceJsonOptions('chat get', args);
  if (parsed.showHelp) {
    return { kind: 'help' };
  }

  return { kind: 'chatGet', chatId: parsed.chatId, workspace: parsed.workspace, json: parsed.json };
}

function parseChatClearCommand(args: readonly string[]): CliCommand {
  const parsed = parseChatIdWorkspaceJsonOptions('chat clear', args);
  if (parsed.showHelp) {
    return { kind: 'help' };
  }

  return { kind: 'chatClear', chatId: parsed.chatId, workspace: parsed.workspace, json: parsed.json };
}

function parseChatSetModelCommand(args: readonly string[]): CliCommand {
  let chatId: string | undefined;
  let model: string | undefined;
  let workspace: string | undefined;
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--help' || token === '-h') {
      assertNoExtraArgs(args.slice(index + 1), token);
      return { kind: 'help' };
    }

    if (token === '--json') {
      json = true;
      continue;
    }

    const workspaceResult = parseWorkspaceOptionToken('chat set-model', args, index, workspace);
    if (workspaceResult.matched) {
      workspace = workspaceResult.workspace;
      index = workspaceResult.index;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for 'chat set-model': ${token}`);
    }

    if (!chatId) {
      chatId = token;
      continue;
    }

    if (!model) {
      model = token;
      continue;
    }

    throw new CliUsageError(`Unexpected argument for 'chat set-model': ${token}`);
  }

  if (!chatId) {
    throw new CliUsageError(`'chat set-model' requires a chat id.`);
  }

  if (!model) {
    throw new CliUsageError(`'chat set-model' requires a model.`);
  }

  return { kind: 'chatSetModel', chatId, model, workspace, json };
}

function parseChatAskCommand(args: readonly string[]): CliCommand {
  let chatId: string | undefined;
  let workspace: string | undefined;
  let prompt: string | undefined;
  let stdin = false;
  let jsonl = false;
  let approvalMode: CliApprovalMode = 'ask';

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--help' || token === '-h') {
      assertNoExtraArgs(args.slice(index + 1), token);
      return { kind: 'help' };
    }

    if (token === '--jsonl') {
      jsonl = true;
      continue;
    }

    if (token === '--stdin') {
      stdin = true;
      continue;
    }

    const workspaceResult = parseWorkspaceOptionToken('chat ask', args, index, workspace);
    if (workspaceResult.matched) {
      workspace = workspaceResult.workspace;
      index = workspaceResult.index;
      continue;
    }

    const promptResult = parsePromptOptionToken('chat ask', args, index, prompt);
    if (promptResult.matched) {
      prompt = promptResult.prompt;
      index = promptResult.index;
      continue;
    }

    const approvalResult = parseApprovalModeOptionToken('chat ask', args, index, approvalMode);
    if (approvalResult.matched) {
      approvalMode = approvalResult.approvalMode;
      index = approvalResult.index;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for 'chat ask': ${token}`);
    }

    if (chatId !== undefined) {
      throw new CliUsageError(`Unexpected argument for 'chat ask': ${token}`);
    }

    chatId = token;
  }

  if (!chatId) {
    throw new CliUsageError(`'chat ask' requires a chat id.`);
  }

  if (!jsonl) {
    throw new CliUsageError(`'chat ask' currently requires --jsonl.`);
  }

  if (stdin && prompt !== undefined) {
    throw new CliUsageError(`'chat ask' accepts either --prompt or --stdin, not both.`);
  }

  if (!stdin && prompt === undefined) {
    throw new CliUsageError(`'chat ask' requires --prompt <text> or --stdin.`);
  }

  return { kind: 'chatAsk', chatId, workspace, prompt, stdin, jsonl, approvalMode };
}

function parseChatWorkspaceJsonOptions(
  command: string,
  args: readonly string[]
): { readonly workspace?: string; readonly json: boolean; readonly showHelp: boolean } {
  let workspace: string | undefined;
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--help' || token === '-h') {
      assertNoExtraArgs(args.slice(index + 1), token);
      return { workspace, json, showHelp: true };
    }

    if (token === '--json') {
      json = true;
      continue;
    }

    const workspaceResult = parseWorkspaceOptionToken(command, args, index, workspace);
    if (workspaceResult.matched) {
      workspace = workspaceResult.workspace;
      index = workspaceResult.index;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for '${command}': ${token}`);
    }

    throw new CliUsageError(`Unexpected argument for '${command}': ${token}`);
  }

  return { workspace, json, showHelp: false };
}

function parseChatIdWorkspaceJsonOptions(
  command: string,
  args: readonly string[]
): { readonly chatId: string; readonly workspace?: string; readonly json: boolean; readonly showHelp: boolean } {
  let chatId: string | undefined;
  let workspace: string | undefined;
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--help' || token === '-h') {
      assertNoExtraArgs(args.slice(index + 1), token);
      return { chatId: '', workspace, json, showHelp: true };
    }

    if (token === '--json') {
      json = true;
      continue;
    }

    const workspaceResult = parseWorkspaceOptionToken(command, args, index, workspace);
    if (workspaceResult.matched) {
      workspace = workspaceResult.workspace;
      index = workspaceResult.index;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for '${command}': ${token}`);
    }

    if (chatId !== undefined) {
      throw new CliUsageError(`Unexpected argument for '${command}': ${token}`);
    }

    chatId = token;
  }

  if (!chatId) {
    throw new CliUsageError(`'${command}' requires a chat id.`);
  }

  return { chatId, workspace, json, showHelp: false };
}

function parseConfigCommand(args: readonly string[]): CliCommand {
  const [subcommand, ...rest] = args;
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    assertNoExtraArgs(rest, subcommand || 'config');
    return { kind: 'help' };
  }

  if (subcommand === 'get') {
    return parseConfigGetCommand(rest);
  }

  if (subcommand === 'set') {
    return parseConfigSetCommand(rest);
  }

  if (subcommand.startsWith('-')) {
    throw new CliUsageError(`Unknown option for 'config': ${subcommand}`);
  }

  throw new CliUsageError(`Unknown config command: ${subcommand}`);
}

function parseConfigGetCommand(args: readonly string[]): CliCommand {
  let key: string | undefined;
  let workspace: string | undefined;
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--help' || token === '-h') {
      assertNoExtraArgs(args.slice(index + 1), token);
      return { kind: 'help' };
    }

    if (token === '--json') {
      json = true;
      continue;
    }

    const workspaceResult = parseWorkspaceOptionToken('config get', args, index, workspace);
    if (workspaceResult.matched) {
      workspace = workspaceResult.workspace;
      index = workspaceResult.index;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for 'config get': ${token}`);
    }

    if (key !== undefined) {
      throw new CliUsageError(`Unexpected argument for 'config get': ${token}`);
    }

    key = token;
  }

  return { kind: 'configGet', key, workspace, json };
}

function parseConfigSetCommand(args: readonly string[]): CliCommand {
  let key: string | undefined;
  let value: JsonValue | undefined;
  let scope: ConfigScope | undefined;
  let workspace: string | undefined;
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--help' || token === '-h') {
      assertNoExtraArgs(args.slice(index + 1), token);
      return { kind: 'help' };
    }

    if (token === '--json') {
      json = true;
      continue;
    }

    const scopeResult = parseScopeOptionToken('config set', args, index, scope);
    if (scopeResult.matched) {
      scope = scopeResult.scope;
      index = scopeResult.index;
      continue;
    }

    const workspaceResult = parseWorkspaceOptionToken('config set', args, index, workspace);
    if (workspaceResult.matched) {
      workspace = workspaceResult.workspace;
      index = workspaceResult.index;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for 'config set': ${token}`);
    }

    if (key === undefined) {
      key = token;
      continue;
    }

    if (value === undefined) {
      value = parseConfigValue(token);
      continue;
    }

    throw new CliUsageError(`Unexpected argument for 'config set': ${token}`);
  }

  if (!key) {
    throw new CliUsageError(`'config set' requires a key.`);
  }

  if (value === undefined) {
    throw new CliUsageError(`'config set' requires a value.`);
  }

  if (!scope) {
    throw new CliUsageError(`'config set' requires --scope global|workspace.`);
  }

  return { kind: 'configSet', key, value, scope, workspace, json };
}

function parseAuthCommand(args: readonly string[]): CliCommand {
  const [provider, subcommand, ...rest] = args;
  if (!provider || provider === '--help' || provider === '-h') {
    assertNoExtraArgs(args.slice(provider ? 1 : 0), provider || 'auth');
    return { kind: 'help' };
  }

  if (provider === 'openrouter') {
    if (subcommand === 'set-key') {
      return parseOpenRouterSetKeyCommand(rest);
    }

    if (subcommand === 'status') {
      return parseAuthStatusCommand('auth openrouter status', rest, 'authOpenRouterStatus');
    }

    throw new CliUsageError(`Unknown auth openrouter command: ${subcommand || '<missing>'}`);
  }

  if (provider === 'codex') {
    if (subcommand === 'status') {
      return parseAuthStatusCommand('auth codex status', rest, 'authCodexStatus');
    }

    throw new CliUsageError(`Unknown auth codex command: ${subcommand || '<missing>'}`);
  }

  if (provider.startsWith('-')) {
    throw new CliUsageError(`Unknown option for 'auth': ${provider}`);
  }

  throw new CliUsageError(`Unknown auth provider: ${provider}`);
}

function parseOpenRouterSetKeyCommand(args: readonly string[]): CliCommand {
  let fromEnv = false;
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--help' || token === '-h') {
      assertNoExtraArgs(args.slice(index + 1), token);
      return { kind: 'help' };
    }

    if (token === '--json') {
      json = true;
      continue;
    }

    if (token === '--from-env') {
      fromEnv = true;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for 'auth openrouter set-key': ${token}`);
    }

    throw new CliUsageError(`Unexpected argument for 'auth openrouter set-key': ${token}`);
  }

  return { kind: 'authOpenRouterSetKey', fromEnv, json };
}

function parseAuthStatusCommand(
  label: string,
  args: readonly string[],
  kind: 'authOpenRouterStatus' | 'authCodexStatus'
): CliCommand {
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--help' || token === '-h') {
      assertNoExtraArgs(args.slice(index + 1), token);
      return { kind: 'help' };
    }

    if (token === '--json') {
      json = true;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for '${label}': ${token}`);
    }

    throw new CliUsageError(`Unexpected argument for '${label}': ${token}`);
  }

  return { kind, json };
}

function parseModelsCommand(args: readonly string[]): CliCommand {
  const [subcommand, ...rest] = args;
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    assertNoExtraArgs(rest, subcommand || 'models');
    return { kind: 'help' };
  }

  if (subcommand === 'list' || subcommand === 'refresh') {
    const options = parseModelsOptions(subcommand, rest);
    if (options.showHelp) {
      return { kind: 'help' };
    }

    return {
      kind: subcommand === 'list' ? 'modelsList' : 'modelsRefresh',
      provider: options.provider,
      json: options.json
    };
  }

  if (subcommand.startsWith('-')) {
    throw new CliUsageError(`Unknown option for 'models': ${subcommand}`);
  }

  throw new CliUsageError(`Unknown models command: ${subcommand}`);
}

function parseModelsOptions(
  subcommand: 'list' | 'refresh',
  args: readonly string[]
): { readonly provider: CliModelProvider; readonly json: boolean; readonly showHelp: boolean } {
  let provider: CliModelProvider = 'all';
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--help' || token === '-h') {
      assertNoExtraArgs(args.slice(index + 1), token);
      return { provider, json, showHelp: true };
    }

    if (token === '--json') {
      json = true;
      continue;
    }

    const providerResult = parseProviderOptionToken(`models ${subcommand}`, args, index, provider);
    if (providerResult.matched) {
      provider = providerResult.provider;
      index = providerResult.index;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for 'models ${subcommand}': ${token}`);
    }

    throw new CliUsageError(`Unexpected argument for 'models ${subcommand}': ${token}`);
  }

  return { provider, json, showHelp: false };
}

function parseAutonomousCommand(args: readonly string[]): CliCommand {
  const [subcommand, ...rest] = args;
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    assertNoExtraArgs(rest, subcommand || 'autonomous');
    return { kind: 'help' };
  }

  if (subcommand === 'list') {
    const options = parseChatWorkspaceJsonOptions('autonomous list', rest);
    if (options.showHelp) {
      return { kind: 'help' };
    }
    return { kind: 'autonomousList', workspace: options.workspace, json: options.json };
  }

  if (subcommand === 'flow') {
    const [flowCommand, ...flowRest] = rest;
    if (flowCommand === 'start') {
      const options = parseAutonomousStartOptions('autonomous flow start', flowRest, 'flow');
      if (options.showHelp) {
        return { kind: 'help' };
      }
      return {
        kind: 'autonomousFlowStart',
        flowId: options.targetId,
        workspace: options.workspace,
        launch: options.launch,
        jsonl: options.jsonl
      };
    }
    if (!flowCommand || flowCommand === '--help' || flowCommand === '-h') {
      assertNoExtraArgs(flowRest, flowCommand || 'autonomous flow');
      return { kind: 'help' };
    }
    throw new CliUsageError(`Unknown autonomous flow command: ${flowCommand}`);
  }

  if (subcommand === 'run') {
    const [runCommand, ...runRest] = rest;
    if (runCommand === 'start') {
      const options = parseAutonomousStartOptions('autonomous run start', runRest, 'run');
      if (options.showHelp) {
        return { kind: 'help' };
      }
      return {
        kind: 'autonomousRunStart',
        runId: options.targetId,
        workspace: options.workspace,
        launch: options.launch,
        jsonl: options.jsonl
      };
    }
    if (!runCommand || runCommand === '--help' || runCommand === '-h') {
      assertNoExtraArgs(runRest, runCommand || 'autonomous run');
      return { kind: 'help' };
    }
    throw new CliUsageError(`Unknown autonomous run command: ${runCommand}`);
  }

  if (subcommand === 'stop') {
    const options = parseAutonomousSessionOptions('autonomous stop', rest);
    if (options.showHelp) {
      return { kind: 'help' };
    }
    return { kind: 'autonomousStop', sessionId: options.sessionId, workspace: options.workspace, json: options.json };
  }

  if (subcommand === 'export') {
    const options = parseAutonomousExportOptions(rest);
    if (options.showHelp) {
      return { kind: 'help' };
    }
    return {
      kind: 'autonomousExport',
      sessionId: options.sessionId,
      workspace: options.workspace,
      format: options.format
    };
  }

  if (subcommand.startsWith('-')) {
    throw new CliUsageError(`Unknown option for 'autonomous': ${subcommand}`);
  }

  throw new CliUsageError(`Unknown autonomous command: ${subcommand}`);
}

function parseAutonomousStartOptions(
  command: string,
  args: readonly string[],
  targetLabel: 'flow' | 'run'
): {
  readonly targetId: string;
  readonly workspace?: string;
  readonly launch: AutonomousLaunchOptions;
  readonly jsonl: boolean;
  readonly showHelp: boolean;
} {
  let targetId: string | undefined;
  let workspace: string | undefined;
  let engineId: AutonomousEngineId = 'dry-run';
  let dryRun = true;
  let jsonl = false;
  let workDir: string | undefined;
  let extraPrompt: string | undefined;
  let vcsIsolation: AutonomousVcsIsolationOptions | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--help' || token === '-h') {
      assertNoExtraArgs(args.slice(index + 1), token);
      return {
        targetId: '',
        workspace,
        launch: { engineId, dryRun, workDir, vcsIsolation, extraPrompt },
        jsonl,
        showHelp: true
      };
    }

    if (token === '--jsonl') {
      jsonl = true;
      continue;
    }

    if (token === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (token === '--no-dry-run') {
      dryRun = false;
      continue;
    }

    const workspaceResult = parseWorkspaceOptionToken(command, args, index, workspace);
    if (workspaceResult.matched) {
      workspace = workspaceResult.workspace;
      index = workspaceResult.index;
      continue;
    }

    const engineResult = parseAutonomousEngineOptionToken(command, args, index, engineId);
    if (engineResult.matched) {
      engineId = engineResult.engineId;
      index = engineResult.index;
      continue;
    }

    const workDirResult = parseStringOptionToken(command, '--workdir', args, index, workDir);
    if (workDirResult.matched) {
      workDir = workDirResult.value;
      index = workDirResult.index;
      continue;
    }

    if (token === '--isolated') {
      vcsIsolation = { ...(vcsIsolation || { enabled: true }), enabled: true };
      continue;
    }

    if (token === '--keep-worktree') {
      vcsIsolation = { ...(vcsIsolation || { enabled: true }), enabled: true, keepWorktree: true };
      continue;
    }

    const vcsCommandResult = parseStringOptionToken(command, '--vcs-command', args, index, vcsIsolation?.command);
    if (vcsCommandResult.matched) {
      vcsIsolation = { ...(vcsIsolation || { enabled: true }), enabled: true, command: vcsCommandResult.value };
      index = vcsCommandResult.index;
      continue;
    }

    const vcsBaseBranchResult = parseStringOptionToken(
      command,
      '--vcs-base-branch',
      args,
      index,
      vcsIsolation?.baseBranch
    );
    if (vcsBaseBranchResult.matched) {
      vcsIsolation = { ...(vcsIsolation || { enabled: true }), enabled: true, baseBranch: vcsBaseBranchResult.value };
      index = vcsBaseBranchResult.index;
      continue;
    }

    const vcsBranchResult = parseStringOptionToken(command, '--vcs-branch', args, index, vcsIsolation?.branchName);
    if (vcsBranchResult.matched) {
      vcsIsolation = { ...(vcsIsolation || { enabled: true }), enabled: true, branchName: vcsBranchResult.value };
      index = vcsBranchResult.index;
      continue;
    }

    const vcsWorktreeResult = parseStringOptionToken(
      command,
      '--vcs-worktree',
      args,
      index,
      vcsIsolation?.worktreePath
    );
    if (vcsWorktreeResult.matched) {
      vcsIsolation = { ...(vcsIsolation || { enabled: true }), enabled: true, worktreePath: vcsWorktreeResult.value };
      index = vcsWorktreeResult.index;
      continue;
    }

    const extraPromptResult = parseStringOptionToken(command, '--extra-prompt', args, index, extraPrompt);
    if (extraPromptResult.matched) {
      extraPrompt = extraPromptResult.value;
      index = extraPromptResult.index;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for '${command}': ${token}`);
    }

    if (targetId !== undefined) {
      throw new CliUsageError(`Unexpected argument for '${command}': ${token}`);
    }
    targetId = token;
  }

  if (!targetId) {
    throw new CliUsageError(`'${command}' requires a ${targetLabel} id.`);
  }

  if (!jsonl) {
    throw new CliUsageError(`'${command}' currently requires --jsonl.`);
  }

  return {
    targetId,
    workspace,
    launch: { engineId, dryRun, workDir, vcsIsolation, extraPrompt },
    jsonl,
    showHelp: false
  };
}

function parseAutonomousSessionOptions(
  command: string,
  args: readonly string[]
): { readonly sessionId: string; readonly workspace?: string; readonly json: boolean; readonly showHelp: boolean } {
  let sessionId: string | undefined;
  let workspace: string | undefined;
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--help' || token === '-h') {
      assertNoExtraArgs(args.slice(index + 1), token);
      return { sessionId: '', workspace, json, showHelp: true };
    }

    if (token === '--json') {
      json = true;
      continue;
    }

    const workspaceResult = parseWorkspaceOptionToken(command, args, index, workspace);
    if (workspaceResult.matched) {
      workspace = workspaceResult.workspace;
      index = workspaceResult.index;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for '${command}': ${token}`);
    }

    if (sessionId !== undefined) {
      throw new CliUsageError(`Unexpected argument for '${command}': ${token}`);
    }
    sessionId = token;
  }

  if (!sessionId) {
    throw new CliUsageError(`'${command}' requires a session id.`);
  }

  return { sessionId, workspace, json, showHelp: false };
}

function parseAutonomousExportOptions(args: readonly string[]): {
  readonly sessionId: string;
  readonly workspace?: string;
  readonly format: AutonomousExportFormat;
  readonly showHelp: boolean;
} {
  let sessionId: string | undefined;
  let workspace: string | undefined;
  let format: AutonomousExportFormat = 'markdown';

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--help' || token === '-h') {
      assertNoExtraArgs(args.slice(index + 1), token);
      return { sessionId: '', workspace, format, showHelp: true };
    }

    const workspaceResult = parseWorkspaceOptionToken('autonomous export', args, index, workspace);
    if (workspaceResult.matched) {
      workspace = workspaceResult.workspace;
      index = workspaceResult.index;
      continue;
    }

    const formatResult = parseAutonomousFormatOptionToken(args, index, format);
    if (formatResult.matched) {
      format = formatResult.format;
      index = formatResult.index;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for 'autonomous export': ${token}`);
    }

    if (sessionId !== undefined) {
      throw new CliUsageError(`Unexpected argument for 'autonomous export': ${token}`);
    }
    sessionId = token;
  }

  if (!sessionId) {
    throw new CliUsageError(`'autonomous export' requires a session id.`);
  }

  return { sessionId, workspace, format, showHelp: false };
}

function parseWorkspaceOptionToken(
  command: string,
  args: readonly string[],
  index: number,
  current: string | undefined
): { readonly matched: boolean; readonly workspace?: string; readonly index: number } {
  const token = args[index];

  if (token === '--workspace') {
    if (current !== undefined) {
      throw new CliUsageError(`Option --workspace was provided more than once for '${command}'.`);
    }

    const value = args[index + 1];
    if (!value || value.startsWith('-')) {
      throw new CliUsageError(`Option --workspace for '${command}' requires a path.`);
    }

    return { matched: true, workspace: value, index: index + 1 };
  }

  if (token.startsWith('--workspace=')) {
    if (current !== undefined) {
      throw new CliUsageError(`Option --workspace was provided more than once for '${command}'.`);
    }

    const value = token.slice('--workspace='.length);
    if (value.trim() === '') {
      throw new CliUsageError(`Option --workspace for '${command}' requires a path.`);
    }

    return { matched: true, workspace: value, index };
  }

  return { matched: false, workspace: current, index };
}

function parseSocketOptionToken(
  command: string,
  args: readonly string[],
  index: number,
  current: string | undefined
): { readonly matched: boolean; readonly socket?: string; readonly index: number } {
  const token = args[index];

  if (token === '--socket') {
    if (current !== undefined) {
      throw new CliUsageError(`Option --socket was provided more than once for '${command}'.`);
    }

    const value = args[index + 1];
    if (!value || value.startsWith('-')) {
      throw new CliUsageError(`Option --socket for '${command}' requires a path.`);
    }

    return { matched: true, socket: value, index: index + 1 };
  }

  if (token.startsWith('--socket=')) {
    if (current !== undefined) {
      throw new CliUsageError(`Option --socket was provided more than once for '${command}'.`);
    }

    const value = token.slice('--socket='.length);
    if (value.trim() === '') {
      throw new CliUsageError(`Option --socket for '${command}' requires a path.`);
    }

    return { matched: true, socket: value, index };
  }

  return { matched: false, socket: current, index };
}

function parseAutonomousEngineOptionToken(
  command: string,
  args: readonly string[],
  index: number,
  current: AutonomousEngineId
): { readonly matched: boolean; readonly engineId: AutonomousEngineId; readonly index: number } {
  const token = args[index];

  if (token === '--engine') {
    const value = args[index + 1];
    return { matched: true, engineId: parseAutonomousEngineId(command, value), index: index + 1 };
  }

  if (token.startsWith('--engine=')) {
    return {
      matched: true,
      engineId: parseAutonomousEngineId(command, token.slice('--engine='.length)),
      index
    };
  }

  return { matched: false, engineId: current, index };
}

function parseStringOptionToken(
  command: string,
  option: string,
  args: readonly string[],
  index: number,
  current: string | undefined
): { readonly matched: boolean; readonly value?: string; readonly index: number } {
  const token = args[index];

  if (token === option) {
    if (current !== undefined) {
      throw new CliUsageError(`Option ${option} was provided more than once for '${command}'.`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith('-')) {
      throw new CliUsageError(`Option ${option} for '${command}' requires a value.`);
    }
    return { matched: true, value, index: index + 1 };
  }

  if (token.startsWith(`${option}=`)) {
    if (current !== undefined) {
      throw new CliUsageError(`Option ${option} was provided more than once for '${command}'.`);
    }
    const value = token.slice(option.length + 1);
    if (value.trim() === '') {
      throw new CliUsageError(`Option ${option} for '${command}' requires a value.`);
    }
    return { matched: true, value, index };
  }

  return { matched: false, value: current, index };
}

function parseAutonomousFormatOptionToken(
  args: readonly string[],
  index: number,
  current: AutonomousExportFormat
): { readonly matched: boolean; readonly format: AutonomousExportFormat; readonly index: number } {
  const token = args[index];
  if (token === '--format') {
    const value = args[index + 1];
    return { matched: true, format: parseAutonomousExportFormat(value), index: index + 1 };
  }
  if (token.startsWith('--format=')) {
    return { matched: true, format: parseAutonomousExportFormat(token.slice('--format='.length)), index };
  }
  return { matched: false, format: current, index };
}

function parseScopeOptionToken(
  command: string,
  args: readonly string[],
  index: number,
  current: ConfigScope | undefined
): { readonly matched: boolean; readonly scope?: ConfigScope; readonly index: number } {
  const token = args[index];

  if (token === '--scope') {
    if (current !== undefined) {
      throw new CliUsageError(`Option --scope was provided more than once for '${command}'.`);
    }

    const value = args[index + 1];
    return { matched: true, scope: parseConfigScope(command, value), index: index + 1 };
  }

  if (token.startsWith('--scope=')) {
    if (current !== undefined) {
      throw new CliUsageError(`Option --scope was provided more than once for '${command}'.`);
    }

    return { matched: true, scope: parseConfigScope(command, token.slice('--scope='.length)), index };
  }

  return { matched: false, scope: current, index };
}

function parseProviderOptionToken(
  command: string,
  args: readonly string[],
  index: number,
  current: CliModelProvider
): { readonly matched: boolean; readonly provider: CliModelProvider; readonly index: number } {
  const token = args[index];

  if (token === '--provider') {
    const value = args[index + 1];
    return { matched: true, provider: parseCliModelProvider(command, value), index: index + 1 };
  }

  if (token.startsWith('--provider=')) {
    return { matched: true, provider: parseCliModelProvider(command, token.slice('--provider='.length)), index };
  }

  return { matched: false, provider: current, index };
}

function parseModelOptionToken(
  command: string,
  args: readonly string[],
  index: number,
  current: string | undefined
): { readonly matched: boolean; readonly model?: string; readonly index: number } {
  const token = args[index];

  if (token === '--model') {
    if (current !== undefined) {
      throw new CliUsageError(`Option --model was provided more than once for '${command}'.`);
    }

    const value = args[index + 1];
    return { matched: true, model: parseChatModel(command, value), index: index + 1 };
  }

  if (token.startsWith('--model=')) {
    if (current !== undefined) {
      throw new CliUsageError(`Option --model was provided more than once for '${command}'.`);
    }

    return { matched: true, model: parseChatModel(command, token.slice('--model='.length)), index };
  }

  return { matched: false, model: current, index };
}

function parsePromptOptionToken(
  command: string,
  args: readonly string[],
  index: number,
  current: string | undefined
): { readonly matched: boolean; readonly prompt?: string; readonly index: number } {
  const token = args[index];

  if (token === '--prompt') {
    if (current !== undefined) {
      throw new CliUsageError(`Option --prompt was provided more than once for '${command}'.`);
    }

    const value = args[index + 1];
    if (value === undefined) {
      throw new CliUsageError(`Option --prompt for '${command}' requires text.`);
    }

    return { matched: true, prompt: value, index: index + 1 };
  }

  if (token.startsWith('--prompt=')) {
    if (current !== undefined) {
      throw new CliUsageError(`Option --prompt was provided more than once for '${command}'.`);
    }

    return { matched: true, prompt: token.slice('--prompt='.length), index };
  }

  return { matched: false, prompt: current, index };
}

function parseApprovalModeOptionToken(
  command: string,
  args: readonly string[],
  index: number,
  current: CliApprovalMode
): { readonly matched: boolean; readonly approvalMode: CliApprovalMode; readonly index: number } {
  const token = args[index];

  if (token === '--approval-mode') {
    const value = args[index + 1];
    return { matched: true, approvalMode: parseCliApprovalMode(command, value), index: index + 1 };
  }

  if (token.startsWith('--approval-mode=')) {
    return {
      matched: true,
      approvalMode: parseCliApprovalMode(command, token.slice('--approval-mode='.length)),
      index
    };
  }

  return { matched: false, approvalMode: current, index };
}

function parseConfigScope(command: string, value: string | undefined): ConfigScope {
  if (value === 'global' || value === 'workspace') {
    return value;
  }

  throw new CliUsageError(`Option --scope for '${command}' must be global or workspace.`);
}

function parseCliModelProvider(command: string, value: string | undefined): CliModelProvider {
  if (value === 'openrouter' || value === 'codex' || value === 'all') {
    return value;
  }

  throw new CliUsageError(`Option --provider for '${command}' must be openrouter, codex, or all.`);
}

function parseAutonomousEngineId(command: string, value: string | undefined): AutonomousEngineId {
  if (
    value === 'dry-run' ||
    value === 'openrouter-api' ||
    value === 'codex-api' ||
    value === 'claude-cli' ||
    value === 'codex-cli'
  ) {
    return value;
  }

  throw new CliUsageError(
    `Option --engine for '${command}' must be dry-run, openrouter-api, codex-api, claude-cli, or codex-cli.`
  );
}

function parseAutonomousExportFormat(value: string | undefined): AutonomousExportFormat {
  if (value === 'markdown' || value === 'json') {
    return value;
  }

  throw new CliUsageError(`Option --format for 'autonomous export' must be markdown or json.`);
}

function parseChatModel(command: string, value: string | undefined): string {
  if (value && value.trim() && !value.startsWith('-')) {
    return value;
  }

  throw new CliUsageError(`Option --model for '${command}' requires a model.`);
}

function parseCliApprovalMode(command: string, value: string | undefined): CliApprovalMode {
  if (value === 'ask' || value === 'auto-readonly' || value === 'auto-all' || value === 'deny') {
    return value;
  }

  throw new CliUsageError(`Option --approval-mode for '${command}' must be ask, auto-readonly, auto-all, or deny.`);
}

function parseConfigValue(rawValue: string): JsonValue {
  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (isJsonValue(parsed)) {
      return parsed;
    }
  } catch {
    return rawValue;
  }

  return rawValue;
}

function isJsonValue(value: unknown): value is JsonValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    (Array.isArray(value) && value.every(isJsonValue)) ||
    (isJsonObject(value) && Object.values(value).every((child) => child === undefined || isJsonValue(child)))
  );
}

function parseWorkspaceOptions(command: string, args: readonly string[]): WorkspaceOptions {
  let workspace: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--help' || token === '-h') {
      assertNoExtraArgs(args.slice(index + 1), token);
      return { workspace, showHelp: true };
    }

    if (token === '--workspace') {
      if (workspace !== undefined) {
        throw new CliUsageError(`Option --workspace was provided more than once for '${command}'.`);
      }

      const value = args[index + 1];
      if (!value || value.startsWith('-')) {
        throw new CliUsageError(`Option --workspace for '${command}' requires a path.`);
      }

      workspace = value;
      index += 1;
      continue;
    }

    if (token.startsWith('--workspace=')) {
      if (workspace !== undefined) {
        throw new CliUsageError(`Option --workspace was provided more than once for '${command}'.`);
      }

      const value = token.slice('--workspace='.length);
      if (value.trim() === '') {
        throw new CliUsageError(`Option --workspace for '${command}' requires a path.`);
      }

      workspace = value;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for '${command}': ${token}`);
    }

    throw new CliUsageError(`Unexpected argument for '${command}': ${token}`);
  }

  return { workspace, showHelp: false };
}

function assertNoExtraArgs(args: readonly string[], option: string): void {
  if (args.length > 0) {
    throw new CliUsageError(`Option ${option} does not accept extra arguments.`);
  }
}

async function checkDirectoryExists(name: string, directoryPath: string): Promise<DoctorCheck> {
  try {
    const stat = await fs.promises.stat(directoryPath);
    if (!stat.isDirectory()) {
      return { name, status: 'fail', message: `not a directory: ${directoryPath}` };
    }

    await fs.promises.access(directoryPath, fs.constants.R_OK);
    return { name, status: 'ok', message: `directory exists: ${directoryPath}` };
  } catch (error) {
    return { name, status: 'fail', message: `missing or inaccessible: ${directoryPath} (${formatError(error)})` };
  }
}

async function checkCreatableDirectory(name: string, directoryPath: string): Promise<DoctorCheck> {
  try {
    await safeMkdir(directoryPath);
    const stat = await fs.promises.stat(directoryPath);
    if (!stat.isDirectory()) {
      return { name, status: 'fail', message: `not a directory: ${directoryPath}` };
    }

    await fs.promises.access(directoryPath, fs.constants.R_OK | fs.constants.W_OK);
    return { name, status: 'ok', message: `accessible: ${directoryPath}` };
  } catch (error) {
    return { name, status: 'fail', message: `unavailable: ${directoryPath} (${formatError(error)})` };
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}
