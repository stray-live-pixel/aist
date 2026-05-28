import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const AIST_AGENT_DIR = '.aist-agent';

export type StorageErrorCode =
  | 'storage.invalidPath'
  | 'storage.pathTraversal'
  | 'storage.serializationFailed'
  | 'storage.mkdirFailed'
  | 'storage.writeFailed'
  | 'storage.appendFailed';

export type StorageErrorContext = {
  filePath?: string;
  rootPath?: string;
  inputPath?: string;
  cause?: unknown;
};

export class StorageError extends Error {
  readonly code: StorageErrorCode;
  readonly filePath?: string;
  readonly rootPath?: string;
  readonly inputPath?: string;
  readonly cause?: unknown;

  constructor(code: StorageErrorCode, message: string, context: StorageErrorContext = {}) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.filePath = context.filePath;
    this.rootPath = context.rootPath;
    this.inputPath = context.inputPath;
    this.cause = context.cause;
  }

  toJSON(): StorageErrorContext & { name: string; message: string; code: StorageErrorCode } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      filePath: this.filePath,
      rootPath: this.rootPath,
      inputPath: this.inputPath
    };
  }
}

export function workspaceAistRoot(workspaceRoot: string): string {
  return path.join(normalizeRootPath(workspaceRoot, 'workspace root'), AIST_AGENT_DIR);
}

export function globalAistRoot(homeDir: string = os.homedir()): string {
  return path.join(normalizeRootPath(homeDir, 'home directory'), AIST_AGENT_DIR);
}

export function globalWorkspaceRoot(workspaceRoot: string, homeDir?: string): string {
  const workspacePath = normalizeRootPath(workspaceRoot, 'workspace root');
  return path.join(globalAistRoot(homeDir), 'workspaces', encodeWorkspaceStorageKey(workspacePath));
}

export function workspaceChatsDir(workspaceRoot: string): string {
  return globalWorkspaceChatsDir(workspaceRoot);
}

export function workspaceRunsDir(workspaceRoot: string): string {
  return globalWorkspaceRunsDir(workspaceRoot);
}

export function workspaceSettingsFile(workspaceRoot: string): string {
  return path.join(workspaceAistRoot(workspaceRoot), 'settings.json');
}

export function workspaceConfigFile(workspaceRoot: string): string {
  return workspaceSettingsFile(workspaceRoot);
}

export function workspaceMemoryFile(workspaceRoot: string): string {
  return path.join(workspaceAistRoot(workspaceRoot), 'memory.json');
}

export function workspaceMemoryEventsFile(workspaceRoot: string): string {
  return path.join(workspaceAistRoot(workspaceRoot), 'memory-events.jsonl');
}

export function workspaceTelemetryDir(workspaceRoot: string): string {
  return globalWorkspaceTelemetryDir(workspaceRoot);
}

export function workspaceToolsDir(workspaceRoot: string): string {
  return path.join(workspaceAistRoot(workspaceRoot), 'tools');
}

export function workspaceAutonomousDir(workspaceRoot: string): string {
  return path.join(workspaceAistRoot(workspaceRoot), 'autonomous');
}

export function workspaceAutonomousSessionsDir(workspaceRoot: string): string {
  return globalWorkspaceAutonomousSessionsDir(workspaceRoot);
}

export function globalSettingsFile(homeDir?: string): string {
  return path.join(globalAistRoot(homeDir), 'settings.json');
}

export function globalConfigFile(homeDir?: string): string {
  return globalSettingsFile(homeDir);
}

export function globalSecretsFile(homeDir?: string): string {
  return path.join(globalAistRoot(homeDir), 'secrets.json');
}

export function globalMemoryFile(homeDir?: string): string {
  return path.join(globalAistRoot(homeDir), 'memory.json');
}

export function globalToolsDir(homeDir?: string): string {
  return path.join(globalAistRoot(homeDir), 'tools');
}

export function globalWorkspaceChatsDir(workspaceRoot: string, homeDir?: string): string {
  return path.join(globalWorkspaceRoot(workspaceRoot, homeDir), 'chats');
}

export function globalWorkspaceRunsDir(workspaceRoot: string, homeDir?: string): string {
  return path.join(globalWorkspaceRoot(workspaceRoot, homeDir), 'runs');
}

export function globalWorkspaceTelemetryDir(workspaceRoot: string, homeDir?: string): string {
  return path.join(globalWorkspaceRoot(workspaceRoot, homeDir), 'telemetry');
}

export function globalWorkspaceAutonomousSessionsDir(workspaceRoot: string, homeDir?: string): string {
  return path.join(globalWorkspaceRoot(workspaceRoot, homeDir), 'autonomous', 'sessions');
}

export function assertWorkspaceRelativePath(relativePath: string): string {
  if (typeof relativePath !== 'string' || relativePath.trim() === '') {
    throw new StorageError('storage.invalidPath', 'Workspace-relative path must be a non-empty string.', {
      inputPath: String(relativePath)
    });
  }

  if (relativePath.includes('\0')) {
    throw new StorageError('storage.invalidPath', 'Workspace-relative path contains a null byte.', {
      inputPath: relativePath
    });
  }

  if (isAbsoluteOrDrivePath(relativePath)) {
    throw new StorageError('storage.pathTraversal', 'Workspace-relative path must not be absolute.', {
      inputPath: relativePath
    });
  }

  const segments = relativePath.split(/[\\/]+/);
  if (segments.some((segment) => segment === '..')) {
    throw new StorageError('storage.pathTraversal', 'Workspace-relative path must not contain parent segments.', {
      inputPath: relativePath
    });
  }

  return path.normalize(relativePath);
}

export function resolveWorkspaceRelativePath(workspaceRoot: string, relativePath: string): string {
  const rootPath = normalizeRootPath(workspaceRoot, 'workspace root');
  const safeRelativePath = assertWorkspaceRelativePath(relativePath);
  const resolvedPath = path.resolve(rootPath, safeRelativePath);

  if (!isPathInsideOrSame(rootPath, resolvedPath)) {
    throw new StorageError('storage.pathTraversal', 'Workspace-relative path escapes the workspace root.', {
      rootPath,
      inputPath: relativePath,
      filePath: resolvedPath
    });
  }

  return resolvedPath;
}

export function resolveWorkspaceAistPath(workspaceRoot: string, relativePath: string): string {
  const rootPath = workspaceAistRoot(workspaceRoot);
  const safeRelativePath = assertWorkspaceRelativePath(relativePath);
  const resolvedPath = path.resolve(rootPath, safeRelativePath);

  if (!isPathInsideOrSame(rootPath, resolvedPath)) {
    throw new StorageError('storage.pathTraversal', 'Workspace storage path escapes the .aist-agent root.', {
      rootPath,
      inputPath: relativePath,
      filePath: resolvedPath
    });
  }

  return resolvedPath;
}

export async function safeMkdir(directoryPath: string): Promise<void> {
  const normalizedPath = normalizeStoragePath(directoryPath, 'directory path');

  try {
    await fs.promises.mkdir(normalizedPath, { recursive: true });
  } catch (cause) {
    throw new StorageError('storage.mkdirFailed', `Failed to create storage directory: ${normalizedPath}`, {
      filePath: normalizedPath,
      cause
    });
  }
}

export type WriteJsonAtomicOptions = {
  spaces?: number;
};

export async function writeJsonAtomic(
  targetPath: string,
  value: unknown,
  options: WriteJsonAtomicOptions = {}
): Promise<void> {
  const normalizedTargetPath = normalizeStoragePath(targetPath, 'target path');
  const directoryPath = path.dirname(normalizedTargetPath);
  await safeMkdir(directoryPath);

  const tempPath = createTempPath(normalizedTargetPath);

  try {
    const serialized = serializeJson(value, options.spaces ?? 2);
    await fs.promises.writeFile(tempPath, `${serialized}\n`, 'utf8');
    await fs.promises.rename(tempPath, normalizedTargetPath);
  } catch (cause) {
    await removeTempBestEffort(tempPath);

    if (cause instanceof StorageError) {
      throw cause;
    }

    throw new StorageError('storage.writeFailed', `Failed to atomically write JSON file: ${normalizedTargetPath}`, {
      filePath: normalizedTargetPath,
      cause
    });
  }
}

export async function appendJsonl(targetPath: string, value: unknown): Promise<void> {
  const normalizedTargetPath = normalizeStoragePath(targetPath, 'target path');
  const directoryPath = path.dirname(normalizedTargetPath);
  const serialized = serializeJson(value);

  await safeMkdir(directoryPath);

  try {
    await fs.promises.appendFile(normalizedTargetPath, `${serialized}\n`, 'utf8');
  } catch (cause) {
    throw new StorageError('storage.appendFailed', `Failed to append JSONL file: ${normalizedTargetPath}`, {
      filePath: normalizedTargetPath,
      cause
    });
  }
}

function normalizeRootPath(rootPath: string, label: string): string {
  return normalizeStoragePath(rootPath, label);
}

function normalizeStoragePath(filePath: string, label: string): string {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    throw new StorageError('storage.invalidPath', `${label} must be a non-empty string.`, {
      inputPath: String(filePath)
    });
  }

  if (filePath.includes('\0')) {
    throw new StorageError('storage.invalidPath', `${label} contains a null byte.`, {
      inputPath: filePath
    });
  }

  return path.resolve(filePath);
}

function encodeWorkspaceStorageKey(workspaceRoot: string): string {
  return Buffer.from(workspaceRoot, 'utf8').toString('base64url');
}

function isAbsoluteOrDrivePath(inputPath: string): boolean {
  return (
    path.isAbsolute(inputPath) ||
    path.posix.isAbsolute(inputPath) ||
    path.win32.isAbsolute(inputPath) ||
    /^[A-Za-z]:/.test(inputPath)
  );
}

function isPathInsideOrSame(rootPath: string, filePath: string): boolean {
  const relativePath = path.relative(rootPath, filePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function createTempPath(targetPath: string): string {
  const directoryPath = path.dirname(targetPath);
  const baseName = path.basename(targetPath);
  return path.join(
    directoryPath,
    `.${baseName}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`
  );
}

function serializeJson(value: unknown, spaces?: number): string {
  try {
    const serialized = spaces === undefined ? JSON.stringify(value) : JSON.stringify(value, null, spaces);
    if (serialized === undefined) {
      throw new Error('JSON.stringify returned undefined.');
    }
    return serialized;
  } catch (cause) {
    if (cause instanceof StorageError) {
      throw cause;
    }

    throw new StorageError('storage.serializationFailed', 'Storage value is not JSON-serializable.', { cause });
  }
}

async function removeTempBestEffort(tempPath: string): Promise<void> {
  try {
    await fs.promises.rm(tempPath, { force: true });
  } catch {
    // Best-effort cleanup only; the primary write error is reported to the caller.
  }
}
