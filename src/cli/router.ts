import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import packageJson from '../../package.json';
import { ChatRepository } from '../core/chatRepository';
import { CodexAuthSessionProvider } from '../core/codexAuth';
import { CodexResponsesTransport } from '../core/codexTransport';
import {
  type ConfigScope,
  FileBackedConfigStore,
  FileSecretStore,
  OPENROUTER_API_KEY_SECRET_KEY
} from '../core/config';
import { DEFAULT_MODEL, FALLBACK_MODEL_OPTIONS } from '../core/modelDefaults';
import type { FetchLike } from '../core/modelTransport';
import { OpenRouterTransport } from '../core/openrouterTransport';
import {
  globalAistRoot,
  globalMemoryFile,
  globalSettingsFile,
  globalToolsDir,
  safeMkdir,
  workspaceAistRoot,
  workspaceChatsDir,
  workspaceRunsDir,
  workspaceSettingsFile,
  workspaceTelemetryDir,
  workspaceToolsDir
} from '../core/storage';
import type {
  Chat,
  ChatMessage,
  ChatSummary,
  JsonObject,
  JsonValue,
  ModelProvider,
  OpenRouterModelOption
} from '../core/types';

export const CLI_NAME = 'aist';
export const CLI_VERSION = packageJson.version;

export type CliCommand =
  | { readonly kind: 'help' }
  | { readonly kind: 'version' }
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
  | { readonly kind: 'modelsRefresh'; readonly provider: CliModelProvider; readonly json: boolean };

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

  if (command.startsWith('-')) {
    throw new CliUsageError(`Unknown option: ${command}`);
  }

  throw new CliUsageError(`Unknown command: ${command}`);
}

export async function runCli(args: readonly string[], options: RunCliOptions = {}): Promise<number> {
  const stdout = options.stdout || ((text: string) => process.stdout.write(text));
  const stderr = options.stderr || ((text: string) => process.stderr.write(text));
  const wantsJson = args.includes('--json');

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
  aist chat new [--workspace <path>] [--model <model>] [--json]
  aist chat list [--workspace <path>] [--json]
  aist chat get <chatId> [--workspace <path>] [--json]
  aist chat clear <chatId> [--workspace <path>] [--json]
  aist chat set-model <chatId> <model> [--workspace <path>] [--json]
  aist config get [key] [--workspace <path>] [--json]
  aist config set <key> <value> --scope global|workspace [--workspace <path>] [--json]
  aist auth openrouter set-key [--from-env] [--json]
  aist auth openrouter status [--json]
  aist auth codex status [--json]
  aist models list [--provider openrouter|codex|all] [--json]
  aist models refresh [--provider openrouter|codex|all] [--json]

Commands:
  paths     Print workspace and global AIST paths.
  doctor    Check workspace and global AIST storage paths.
  chat      Create, list, inspect and update file-backed chats.
  config    Read or write non-secret CLI/backend settings.
  auth      Manage model provider auth status and global secrets.
  models    List model options from provider adapters or safe fallbacks.

Options:
  --workspace <path>  Workspace root. Defaults to the current directory.
  --model <model>     Model id for chat creation.
  --scope <scope>     Config write scope: global or workspace.
  --provider <name>   Model provider: openrouter, codex, or all.
  --from-env          Read OPENROUTER_API_KEY instead of stdin for set-key.
  --json              Print machine-readable JSON.
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
    workspaceChatsDir: workspaceChatsDir(workspaceRoot),
    workspaceRunsDir: workspaceRunsDir(workspaceRoot),
    workspaceTelemetryDir: workspaceTelemetryDir(workspaceRoot),
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
Workspace chats: ${paths.workspaceChatsDir}
Workspace runs: ${paths.workspaceRunsDir}
Workspace telemetry: ${paths.workspaceTelemetryDir}
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

type ChatSummaryJson = {
  readonly id: string;
  readonly title: string;
  readonly model: string;
  readonly previousChatId: string | null;
  readonly compactedAt: number | null;
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
  const repository = new ChatRepository({ workspaceRoot });
  const model = command.model || (await resolveChatModel(workspaceRoot, options));
  const chat = await repository.create({ model });
  return toChatCommandResult(workspaceRoot, chat);
}

async function listChatsCommandResult(
  command: Extract<CliCommand, { kind: 'chatList' }>,
  options: RunCliOptions
): Promise<ChatListCommandResult> {
  const workspaceRoot = await resolveChatWorkspaceRoot(command.workspace, options);
  const repository = new ChatRepository({ workspaceRoot });
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
  const repository = new ChatRepository({ workspaceRoot });
  const chat = await requireChat(repository, command.chatId);
  return toChatCommandResult(workspaceRoot, chat);
}

async function clearChatCommandResult(
  command: Extract<CliCommand, { kind: 'chatClear' }>,
  options: RunCliOptions
): Promise<ChatCommandResult> {
  const workspaceRoot = await resolveChatWorkspaceRoot(command.workspace, options);
  const repository = new ChatRepository({ workspaceRoot });
  await requireChat(repository, command.chatId);
  const chat = await repository.clear(command.chatId);
  return toChatCommandResult(workspaceRoot, chat);
}

async function setChatModelCommandResult(
  command: Extract<CliCommand, { kind: 'chatSetModel' }>,
  options: RunCliOptions
): Promise<ChatCommandResult> {
  const workspaceRoot = await resolveChatWorkspaceRoot(command.workspace, options);
  const repository = new ChatRepository({ workspaceRoot });
  await requireChat(repository, command.chatId);
  const chat = await repository.update(command.chatId, { model: command.model });
  return toChatCommandResult(workspaceRoot, chat);
}

async function resolveChatWorkspaceRoot(workspace: string | undefined, options: RunCliOptions): Promise<string> {
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
Storage: ${path.join(workspaceChatsDir(result.workspaceRoot), result.chat.id)}
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

function toChatJson(chat: Chat): ChatJson {
  return {
    id: chat.id,
    title: chat.title,
    model: chat.model,
    previousChatId: chat.previousChatId ?? null,
    compactedAt: chat.compactedAt ?? null,
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
    previousChatId: chat.previousChatId,
    compactedAt: chat.compactedAt,
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

function parseChatModel(command: string, value: string | undefined): string {
  if (value && value.trim() && !value.startsWith('-')) {
    return value;
  }

  throw new CliUsageError(`Option --model for '${command}' requires a model.`);
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
