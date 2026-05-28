import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import * as vscode from 'vscode';

import { DaemonJsonRpcClient } from '../../../cli/daemonClient';
import { getDaemonSocketPath } from '../../../cli/daemonProtocol';
import type { AistLogger } from '../../shared/logger';

export type DaemonProcessStatus = {
  state: 'idle' | 'starting' | 'running' | 'error';
  socketPath: string;
  command?: string;
  args?: readonly string[];
  message?: string;
  restartCount: number;
};

export type DaemonCommand = {
  command: string;
  args: string[];
  displayPath: string;
};

export type VscodeDaemonProcessManagerOptions = {
  context: vscode.ExtensionContext;
  workspaceRoot: string;
  logger: AistLogger;
  spawnProcess?: typeof spawn;
  connectClient?: (socketPath: string) => Promise<DaemonJsonRpcClient>;
  existsSync?: (filePath: string) => boolean;
  setTimeout?: typeof setTimeout;
};

const CONNECT_TIMEOUT_MS = 8000;
const CONNECT_POLL_MS = 150;
const MAX_RESTART_DELAY_MS = 5000;

export class VscodeDaemonProcessManager implements vscode.Disposable {
  readonly socketPath: string;

  private readonly spawnProcess: typeof spawn;
  private readonly connectClient: (socketPath: string) => Promise<DaemonJsonRpcClient>;
  private readonly existsSync: (filePath: string) => boolean;
  private readonly setTimer: typeof setTimeout;
  private child: ChildProcessWithoutNullStreams | undefined;
  private client: DaemonJsonRpcClient | undefined;
  private startPromise: Promise<DaemonJsonRpcClient> | undefined;
  private restartTimer: NodeJS.Timeout | undefined;
  private disposed = false;
  private restartCount = 0;
  private statusValue: DaemonProcessStatus;

  constructor(private readonly options: VscodeDaemonProcessManagerOptions) {
    this.socketPath = getDaemonSocketPath(options.workspaceRoot);
    this.spawnProcess = options.spawnProcess || spawn;
    this.connectClient = options.connectClient || ((socketPath) => DaemonJsonRpcClient.connect({ socketPath }));
    this.existsSync = options.existsSync || fs.existsSync;
    this.setTimer = options.setTimeout || setTimeout;
    this.statusValue = {
      state: 'idle',
      socketPath: this.socketPath,
      restartCount: this.restartCount
    };
  }

  get status(): DaemonProcessStatus {
    return this.statusValue;
  }

  async getClient(): Promise<DaemonJsonRpcClient> {
    if (this.client) {
      return this.client;
    }

    if (!this.startPromise) {
      this.startPromise = this.start();
    }

    try {
      this.client = await this.startPromise;
      return this.client;
    } finally {
      this.startPromise = undefined;
    }
  }

  async restart(): Promise<DaemonJsonRpcClient> {
    this.client?.close();
    this.client = undefined;
    this.child?.kill();
    this.child = undefined;
    return this.getClient();
  }

  dispose(): void {
    this.disposed = true;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = undefined;
    }
    this.client?.close();
    this.client = undefined;
    this.child?.kill();
    this.child = undefined;
  }

  private async start(): Promise<DaemonJsonRpcClient> {
    this.setStatus({ state: 'starting', message: 'Connecting to AIST daemon.' });

    const existing = await this.tryConnect();
    if (existing) {
      this.setStatus({ state: 'running', message: 'Connected to existing AIST daemon.' });
      return existing;
    }

    const daemonCommand = this.resolveDaemonCommand();
    this.setStatus({
      state: 'starting',
      command: daemonCommand.command,
      args: daemonCommand.args,
      message: `Starting AIST daemon: ${daemonCommand.displayPath}`
    });
    this.spawnDaemon(daemonCommand);

    let client: DaemonJsonRpcClient;
    try {
      client = await this.waitForDaemon();
    } catch (error) {
      this.child?.kill();
      this.child = undefined;
      this.setStatus({ state: 'error', message: error instanceof Error ? error.message : String(error) });
      throw error;
    }
    this.setStatus({
      state: 'running',
      command: daemonCommand.command,
      args: daemonCommand.args,
      message: 'AIST daemon is running.'
    });
    return client;
  }

  private resolveDaemonCommand(): DaemonCommand {
    const configured = vscode.workspace.getConfiguration('openrouterAgent').get<string>('daemonBinaryPath')?.trim();
    const workspaceBin = path.join(
      this.options.workspaceRoot,
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'aist.cmd' : 'aist'
    );
    const bundledCli = path.join(this.options.context.extensionPath, 'dist', 'cli', 'main.js');
    const bundledBin = path.join(
      this.options.context.extensionPath,
      process.platform === 'win32' ? 'aist.cmd' : 'aist'
    );
    const candidate = [configured, bundledBin, workspaceBin, this.findOnPath('aist')].find((item): item is string =>
      Boolean(item && this.existsSync(item))
    );

    if (candidate) {
      return this.toDaemonCommand(candidate);
    }

    if (this.existsSync(bundledCli)) {
      return {
        command: process.execPath,
        args: [bundledCli, 'daemon', '--workspace', this.options.workspaceRoot],
        displayPath: bundledCli
      };
    }

    return {
      command: 'aist',
      args: ['daemon', '--workspace', this.options.workspaceRoot],
      displayPath: 'aist'
    };
  }

  private toDaemonCommand(candidate: string): DaemonCommand {
    if (candidate.endsWith('.js')) {
      return {
        command: process.execPath,
        args: [candidate, 'daemon', '--workspace', this.options.workspaceRoot],
        displayPath: candidate
      };
    }

    return {
      command: candidate,
      args: ['daemon', '--workspace', this.options.workspaceRoot],
      displayPath: candidate
    };
  }

  private findOnPath(binaryName: string): string | undefined {
    const pathValue = process.env.PATH || '';
    const suffixes = process.platform === 'win32' ? ['.cmd', '.exe', ''] : [''];
    for (const directory of pathValue.split(path.delimiter)) {
      for (const suffix of suffixes) {
        const candidate = path.join(directory, `${binaryName}${suffix}`);
        if (this.existsSync(candidate)) {
          return candidate;
        }
      }
    }
    return undefined;
  }

  private spawnDaemon(daemonCommand: DaemonCommand): void {
    this.child = this.spawnProcess(daemonCommand.command, daemonCommand.args, {
      cwd: this.options.workspaceRoot,
      env: process.env
    });
    let stderr = '';
    this.child.stderr.on('data', (chunk: Buffer) => {
      stderr = `${stderr}${chunk.toString('utf8')}`.slice(-4000);
    });
    this.child.on('error', (error) => {
      this.setStatus({ state: 'error', message: error.message });
      this.options.logger.error('Failed to start AIST daemon', error);
    });
    this.child.on('exit', (code, signal) => {
      this.child = undefined;
      this.client?.close();
      this.client = undefined;
      if (this.disposed) {
        return;
      }

      const message = `AIST daemon exited (${code ?? signal ?? 'unknown'}).${stderr ? ` ${stderr.trim()}` : ''}`;
      this.setStatus({ state: 'error', message });
      this.options.logger.error('AIST daemon exited', { code, signal, stderr: stderr.trim() });
      this.scheduleRestart();
    });
  }

  private async waitForDaemon(): Promise<DaemonJsonRpcClient> {
    const startedAt = Date.now();
    let lastError: unknown;
    while (Date.now() - startedAt < CONNECT_TIMEOUT_MS) {
      const client = await this.tryConnect().catch((error) => {
        lastError = error;
        return undefined;
      });
      if (client) {
        return client;
      }
      await delay(CONNECT_POLL_MS);
    }

    const message = lastError instanceof Error ? lastError.message : 'socket did not become available';
    throw new Error(`AIST daemon did not start in time: ${message}`);
  }

  private async tryConnect(): Promise<DaemonJsonRpcClient | undefined> {
    try {
      return await this.connectClient(this.socketPath);
    } catch {
      return undefined;
    }
  }

  private scheduleRestart(): void {
    if (this.disposed || this.restartTimer) {
      return;
    }

    this.restartCount += 1;
    const delayMs = Math.min(MAX_RESTART_DELAY_MS, 250 * 2 ** Math.min(5, this.restartCount));
    this.restartTimer = this.setTimer(() => {
      this.restartTimer = undefined;
      void this.getClient().catch((error) => {
        this.setStatus({ state: 'error', message: error instanceof Error ? error.message : String(error) });
      });
    }, delayMs);
    this.restartTimer.unref();
  }

  private setStatus(patch: Partial<DaemonProcessStatus>): void {
    this.statusValue = {
      ...this.statusValue,
      ...patch,
      socketPath: this.socketPath,
      restartCount: this.restartCount
    };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
