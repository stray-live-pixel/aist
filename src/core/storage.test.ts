import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  StorageError,
  appendJsonl,
  globalAistRoot,
  globalConfigFile,
  globalMemoryFile,
  globalSecretsFile,
  globalSettingsFile,
  globalToolsDir,
  resolveWorkspaceAistPath,
  resolveWorkspaceRelativePath,
  safeMkdir,
  workspaceAistRoot,
  workspaceAutonomousDir,
  workspaceAutonomousSessionsDir,
  workspaceChatsDir,
  workspaceConfigFile,
  workspaceMemoryEventsFile,
  workspaceMemoryFile,
  workspaceRunsDir,
  workspaceSettingsFile,
  workspaceTelemetryDir,
  workspaceToolsDir,
  writeJsonAtomic
} from './storage';

const tempDirs: string[] = [];

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('core storage paths', () => {
  it('keeps workspace and global roots separate', () => {
    const tempDir = createTempDir();
    const workspaceRoot = path.join(tempDir, 'workspace');
    const homeDir = path.join(tempDir, 'home');

    expect(workspaceAistRoot(workspaceRoot)).toBe(path.join(workspaceRoot, '.aist-agent'));
    expect(globalAistRoot(homeDir)).toBe(path.join(homeDir, '.aist-agent'));
    expect(workspaceAistRoot(workspaceRoot)).not.toBe(globalAistRoot(homeDir));
    expect(globalSecretsFile(homeDir)).toBe(path.join(homeDir, '.aist-agent', 'secrets.json'));
    expect(globalSettingsFile(homeDir)).toBe(path.join(homeDir, '.aist-agent', 'settings.json'));
    expect(globalConfigFile(homeDir)).toBe(globalSettingsFile(homeDir));
    expect(globalMemoryFile(homeDir)).toBe(path.join(homeDir, '.aist-agent', 'memory.json'));
    expect(globalToolsDir(homeDir)).toBe(path.join(homeDir, '.aist-agent', 'tools'));
  });

  it('provides workspace helpers for file-backed agent artifacts', () => {
    const workspaceRoot = path.join(createTempDir(), 'workspace');
    const aistRoot = path.join(workspaceRoot, '.aist-agent');

    expect(workspaceChatsDir(workspaceRoot)).toBe(path.join(aistRoot, 'chats'));
    expect(workspaceRunsDir(workspaceRoot)).toBe(path.join(aistRoot, 'runs'));
    expect(workspaceSettingsFile(workspaceRoot)).toBe(path.join(aistRoot, 'settings.json'));
    expect(workspaceConfigFile(workspaceRoot)).toBe(workspaceSettingsFile(workspaceRoot));
    expect(workspaceMemoryFile(workspaceRoot)).toBe(path.join(aistRoot, 'memory.json'));
    expect(workspaceMemoryEventsFile(workspaceRoot)).toBe(path.join(aistRoot, 'memory-events.jsonl'));
    expect(workspaceTelemetryDir(workspaceRoot)).toBe(path.join(aistRoot, 'telemetry'));
    expect(workspaceToolsDir(workspaceRoot)).toBe(path.join(aistRoot, 'tools'));
    expect(workspaceAutonomousDir(workspaceRoot)).toBe(path.join(aistRoot, 'autonomous'));
    expect(workspaceAutonomousSessionsDir(workspaceRoot)).toBe(path.join(aistRoot, 'autonomous', 'sessions'));
  });
});

describe('workspace path guards', () => {
  it('resolves safe workspace-relative paths', () => {
    const workspaceRoot = path.join(createTempDir(), 'workspace');

    expect(resolveWorkspaceRelativePath(workspaceRoot, 'src/index.ts')).toBe(
      path.join(workspaceRoot, 'src', 'index.ts')
    );
    expect(resolveWorkspaceAistPath(workspaceRoot, 'chats/chat-1/meta.json')).toBe(
      path.join(workspaceRoot, '.aist-agent', 'chats', 'chat-1', 'meta.json')
    );
  });

  it('rejects parent segments, absolute paths and traversal attempts', () => {
    const workspaceRoot = path.join(createTempDir(), 'workspace');
    const unsafePaths = [
      '../secret.json',
      'nested/../../secret.json',
      '/tmp/secret.json',
      path.resolve('/tmp/secret.json'),
      'nested\\..\\secret.json',
      'C:\\Users\\me\\secret.json'
    ];

    for (const unsafePath of unsafePaths) {
      expectStorageError(() => resolveWorkspaceRelativePath(workspaceRoot, unsafePath), 'storage.pathTraversal');
      expectStorageError(() => resolveWorkspaceAistPath(workspaceRoot, unsafePath), 'storage.pathTraversal');
    }
  });
});

describe('storage primitives', () => {
  it('creates directories safely', async () => {
    const targetDir = path.join(createTempDir(), 'nested', 'dir');

    await safeMkdir(targetDir);

    expect(fs.statSync(targetDir).isDirectory()).toBe(true);
  });

  it('writes JSON via a sibling temp file and rename', async () => {
    const targetPath = path.join(createTempDir(), 'state', 'run.json');

    await writeJsonAtomic(targetPath, { id: 'run-1', status: 'running' });
    await writeJsonAtomic(targetPath, { id: 'run-1', status: 'completed' });

    expect(JSON.parse(fs.readFileSync(targetPath, 'utf8'))).toEqual({ id: 'run-1', status: 'completed' });
    expect(fs.readdirSync(path.dirname(targetPath))).toEqual(['run.json']);
  });

  it('appends JSONL without rewriting existing log content', async () => {
    const targetPath = path.join(createTempDir(), 'events', 'events.jsonl');

    await safeMkdir(path.dirname(targetPath));
    fs.writeFileSync(targetPath, `${JSON.stringify({ index: 1, status: 'existing' })}\n`, 'utf8');
    await appendJsonl(targetPath, { index: 2, status: 'appended' });

    const lines = fs.readFileSync(targetPath, 'utf8').trimEnd().split('\n');
    expect(lines.map((line) => JSON.parse(line))).toEqual([
      { index: 1, status: 'existing' },
      { index: 2, status: 'appended' }
    ]);
  });

  it('creates the JSONL parent directory on first append', async () => {
    const targetPath = path.join(createTempDir(), 'logs', 'events.jsonl');

    await appendJsonl(targetPath, { event: 'created' });

    expect(fs.readFileSync(targetPath, 'utf8')).toBe(`${JSON.stringify({ event: 'created' })}\n`);
  });

  it('reports JSON serialization failures as structured storage errors', async () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    await expect(writeJsonAtomic(path.join(createTempDir(), 'state.json'), circular)).rejects.toMatchObject({
      code: 'storage.serializationFailed'
    });
    await expect(appendJsonl(path.join(createTempDir(), 'events.jsonl'), undefined)).rejects.toMatchObject({
      code: 'storage.serializationFailed'
    });
  });
});

function createTempDir(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aist-storage-'));
  tempDirs.push(tempDir);
  return tempDir;
}

function expectStorageError(action: () => unknown, code: StorageError['code']): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(StorageError);
    expect((error as StorageError).code).toBe(code);
    return;
  }

  throw new Error(`Expected StorageError with code ${code}`);
}
