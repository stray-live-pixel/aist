import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import type { ModelClient } from '../../core/entities/model/modelTransport';
import {
  globalSettingsFile,
  globalWorkspaceAutonomousSessionsDir,
  workspaceSettingsFile
} from '../../core/entities/storage/storage';
import type { OpenRouterMessage } from '../../core/shared/types/types';
import { AistDaemonServer } from '../daemon';
import { DaemonJsonRpcClient, DaemonJsonRpcError } from '../daemonClient';
import {
  DAEMON_BUSY_ERROR_CODE,
  type DaemonAutonomousExportResult,
  type DaemonAutonomousStartResult,
  type DaemonAutonomousStateResult,
  type DaemonChatAskResult,
  type DaemonChatCreateResult,
  type DaemonChatGetResult,
  type DaemonEvent,
  type DaemonState
} from '../daemonProtocol';

export const tempDirs: string[] = [];

export const servers: AistDaemonServer[] = [];

export const clients: DaemonJsonRpcClient[] = [];

afterEach(async () => {
  for (const client of clients.splice(0)) {
    client.close();
  }

  for (const server of servers.splice(0)) {
    await server.close();
  }

  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

export async function startDaemon(
  modelClient: ModelClient
): Promise<{ server: AistDaemonServer; workspaceRoot: string; homeDir: string }> {
  const workspaceRoot = createTempDir('aist-daemon-workspace-');
  const homeDir = createTempDir('aist-daemon-home-');
  const server = new AistDaemonServer({ workspaceRoot, homeDir, modelClient });
  await server.start();
  servers.push(server);
  return { server, workspaceRoot, homeDir };
}

export async function connectClient(server: AistDaemonServer): Promise<DaemonJsonRpcClient> {
  const client = await DaemonJsonRpcClient.connect({ socketPath: server.socketPath });
  clients.push(client);
  return client;
}

export function createTempDir(prefix: string): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(tempDir);
  return tempDir;
}

export function createNativeAutonomousFlow(workspaceRoot: string, flowId: string): void {
  const flowRoot = path.join(workspaceRoot, '.aist-agent', 'autonomous', 'flows', flowId);
  fs.mkdirSync(flowRoot, { recursive: true });
  fs.writeFileSync(
    path.join(flowRoot, '.index.md'),
    ['---', 'title: Demo flow', 'stages:', '  - 1-stage.md', '---', '', '# Demo flow', ''].join('\n'),
    'utf8'
  );
  fs.writeFileSync(
    path.join(flowRoot, '1-stage.md'),
    ['---', 'title: Stage one', 'contexts: []', '---', '', '# Stage one', '', 'Say hello.', ''].join('\n'),
    'utf8'
  );
}

export type QueuedDaemonModelClient = ModelClient & {
  calls: Array<{ messages: OpenRouterMessage[] }>;
};

export function createQueuedModelClient(responses: OpenRouterMessage[]): QueuedDaemonModelClient {
  const queue = [...responses];
  const calls: QueuedDaemonModelClient['calls'] = [];
  return {
    calls,
    chat: async (messages) => {
      calls.push({ messages });
      const next = queue.shift();
      if (!next) {
        throw new Error('Unexpected fake model request.');
      }
      return next;
    }
  };
}

export function createDeferred<T>(): {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

export function createEventCollector(client: DaemonJsonRpcClient): {
  readonly items: DaemonEvent[];
  waitFor<T extends DaemonEvent>(predicate: (event: DaemonEvent) => event is T): Promise<T>;
  waitFor(predicate: (event: DaemonEvent) => boolean): Promise<DaemonEvent>;
} {
  const items: DaemonEvent[] = [];
  const waiters: Array<{
    predicate(event: DaemonEvent): boolean;
    resolve(event: DaemonEvent): void;
    reject(error: unknown): void;
    timeout: NodeJS.Timeout;
  }> = [];

  client.onEvent((event) => {
    items.push(event);
    for (const waiter of [...waiters]) {
      if (!waiter.predicate(event)) {
        continue;
      }

      clearTimeout(waiter.timeout);
      waiters.splice(waiters.indexOf(waiter), 1);
      waiter.resolve(event);
    }
  });

  return {
    items,
    waitFor(predicate: (event: DaemonEvent) => boolean): Promise<DaemonEvent> {
      const existing = items.find(predicate);
      if (existing) {
        return Promise.resolve(existing);
      }

      return new Promise<DaemonEvent>((resolve, reject) => {
        const waiter = {
          predicate,
          resolve,
          reject,
          timeout: setTimeout(() => {
            waiters.splice(waiters.indexOf(waiter), 1);
            reject(
              new Error(`Timed out waiting for daemon event. Seen: ${items.map((event) => event.type).join(', ')}`)
            );
          }, 3000)
        };
        waiters.push(waiter);
      });
    }
  };
}
