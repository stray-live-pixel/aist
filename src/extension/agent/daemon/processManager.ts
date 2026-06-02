import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import fs from 'node:fs';
import * as vscode from 'vscode';

import { DaemonJsonRpcClient } from '../../../cli/daemonClient';
import { getDaemonSocketPath } from '../../../cli/daemonProtocol';
import { CONNECT_POLL_MS, CONNECT_TIMEOUT_MS, MAX_RESTART_DELAY_MS } from './processManager/constants';
import { delay } from './processManager/delay';
import { resolveDaemonCommand } from './processManager/resolveDaemonCommand';
import type { DaemonCommand, DaemonProcessStatus, VscodeDaemonProcessManagerOptions } from './processManager/types';

export type { DaemonCommand, DaemonProcessStatus, VscodeDaemonProcessManagerOptions } from './processManager/types';

/**
 * Что это: lifecycle-manager локального AIST daemon внутри VS Code.
 * Зачем нужно: extension получает готовый JSON-RPC client и автоматически поднимает daemon при необходимости.
 * Какую проблему решает: UI не знает про spawn, socket polling и restart после падения процесса.
 */
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
    this.statusValue = { state: 'idle', socketPath: this.socketPath, restartCount: this.restartCount };
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
    return this.finishStartedDaemon({ daemonCommand });
  }

  private async finishStartedDaemon({ daemonCommand }: { daemonCommand: DaemonCommand }): Promise<DaemonJsonRpcClient> {
    try {
      const client = await this.waitForDaemon();
      this.setStatus({
        state: 'running',
        command: daemonCommand.command,
        args: daemonCommand.args,
        message: 'AIST daemon is running.'
      });
      return client;
    } catch (error) {
      this.child?.kill();
      this.child = undefined;
      this.setStatus({ state: 'error', message: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  private resolveDaemonCommand(): DaemonCommand {
    return resolveDaemonCommand({
      context: this.options.context,
      workspaceRoot: this.options.workspaceRoot,
      existsSync: this.existsSync
    });
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
    this.child.on('exit', (code, signal) => this.handleDaemonExit({ code, signal, stderr }));
  }

  private handleDaemonExit({
    code,
    signal,
    stderr
  }: {
    code: number | null;
    signal: string | null;
    stderr: string;
  }): void {
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
      await delay({ ms: CONNECT_POLL_MS });
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
    this.statusValue = { ...this.statusValue, ...patch, socketPath: this.socketPath, restartCount: this.restartCount };
  }
}
