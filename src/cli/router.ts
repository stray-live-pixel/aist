import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import packageJson from '../../package.json';
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

export const CLI_NAME = 'aist';
export const CLI_VERSION = packageJson.version;

export type CliCommand =
  | { readonly kind: 'help' }
  | { readonly kind: 'version' }
  | { readonly kind: 'doctor'; readonly workspace?: string }
  | { readonly kind: 'paths'; readonly workspace?: string };

export class CliUsageError extends Error {
  readonly exitCode = 2;

  constructor(message: string) {
    super(message);
    this.name = 'CliUsageError';
  }
}

export type CliWriter = (text: string) => void;

export type RunCliOptions = {
  cwd?: string;
  homeDir?: string;
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

  if (command.startsWith('-')) {
    throw new CliUsageError(`Unknown option: ${command}`);
  }

  throw new CliUsageError(`Unknown command: ${command}`);
}

export async function runCli(args: readonly string[], options: RunCliOptions = {}): Promise<number> {
  const stdout = options.stdout || ((text: string) => process.stdout.write(text));
  const stderr = options.stderr || ((text: string) => process.stderr.write(text));

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

    const result = await runDoctor({ ...options, workspace: command.workspace });
    stdout(formatDoctorOutput(result));

    if (!result.ok) {
      stderr(`${CLI_NAME} doctor failed: one or more checks failed.\n`);
      return 1;
    }

    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const exitCode = error instanceof CliUsageError ? error.exitCode : 1;
    stderr(`${CLI_NAME}: ${message}\n`);

    if (error instanceof CliUsageError) {
      stderr(`Run '${CLI_NAME} --help' for usage.\n`);
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

Commands:
  paths    Print workspace and global AIST paths.
  doctor   Check workspace and global AIST storage paths.

Options:
  --workspace <path>  Workspace root. Defaults to the current directory.
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

type WorkspaceOptions = {
  readonly workspace?: string;
  readonly showHelp: boolean;
};

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
