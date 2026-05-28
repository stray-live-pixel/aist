import { EventEmitter } from 'node:events';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { VscodeDaemonProcessManager } from './processManager';

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: () => ({
      get: () => ''
    })
  }
}));

describe('VscodeDaemonProcessManager', () => {
  it('starts the bundled CLI daemon when no existing socket is reachable', async () => {
    const extensionPath = '/ext/aist';
    const workspaceRoot = '/repo/workspace';
    const bundledCli = path.join(extensionPath, 'dist', 'cli', 'main.js');
    const spawned: Array<{ command: string; args: string[]; cwd?: string }> = [];
    let connectAttempts = 0;

    const manager = new VscodeDaemonProcessManager({
      context: { extensionPath } as never,
      workspaceRoot,
      logger: loggerMock(),
      existsSync: (filePath) => filePath === bundledCli,
      connectClient: async () => {
        connectAttempts += 1;
        if (connectAttempts === 1) {
          throw new Error('socket missing');
        }
        return { close: vi.fn() } as never;
      },
      spawnProcess: ((command: string, args: string[], options: { cwd?: string }) => {
        spawned.push({ command, args, cwd: options.cwd });
        const child = new EventEmitter() as EventEmitter & {
          stderr: EventEmitter;
          kill(): void;
        };
        child.stderr = new EventEmitter();
        child.kill = vi.fn();
        return child;
      }) as never
    });

    await manager.getClient();

    expect(spawned).toEqual([
      {
        command: process.execPath,
        args: [bundledCli, 'daemon', '--workspace', workspaceRoot],
        cwd: workspaceRoot
      }
    ]);
    expect(manager.status).toMatchObject({
      state: 'running',
      command: process.execPath
    });
  });
});

function loggerMock() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    show: vi.fn(),
    dispose: vi.fn()
  };
}
