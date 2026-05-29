import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import type { ModelClient } from '../core/entities/model/modelTransport';
import {
  globalSettingsFile,
  globalWorkspaceAutonomousSessionsDir,
  workspaceSettingsFile
} from '../core/entities/storage/storage';
import type { OpenRouterMessage } from '../core/shared/types/types';
import { AistDaemonServer } from './daemon';
import { DaemonJsonRpcClient, DaemonJsonRpcError } from './daemonClient';
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
} from './daemonProtocol';

const tempDirs: string[] = [];
const servers: AistDaemonServer[] = [];
const clients: DaemonJsonRpcClient[] = [];

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

describe('AIST daemon JSON-RPC local socket', () => {
  it('serves state.get and chat.ask while streaming subscribed events', async () => {
    const modelClient = createQueuedModelClient([
      {
        role: 'assistant',
        content: 'Daemon final answer.',
        usage: { promptTokens: 3, completionTokens: 4, totalTokens: 7 }
      }
    ]);
    const { server, workspaceRoot } = await startDaemon(modelClient);
    fs.mkdirSync(path.join(workspaceRoot, '.aist-agent'), { recursive: true });
    fs.writeFileSync(
      workspaceSettingsFile(workspaceRoot),
      `${JSON.stringify({
        customSkills: [
          {
            id: 'daemon-local-skill',
            label: 'Daemon local skill',
            description: 'Loaded by daemon from workspace settings.',
            command: 'echo daemon',
            permission: 'ask'
          }
        ]
      })}\n`,
      'utf8'
    );
    const client = await connectClient(server);
    const events = createEventCollector(client);
    await client.subscribe();

    const initialState = await client.request<DaemonState>('state.get');
    expect(initialState.chats).toEqual([]);
    expect(initialState.transport).toMatchObject({
      kind: 'local-socket',
      framing: 'json-rpc-2.0-newline-delimited',
      socketPath: server.socketPath
    });

    const created = await client.request<DaemonChatCreateResult>('chat.create', { model: 'fake-model' });
    const ask = await client.request<DaemonChatAskResult>('chat.ask', {
      chatId: created.chat.id,
      prompt: 'Hello daemon'
    });

    expect(ask).toMatchObject({
      chatId: created.chat.id,
      accepted: true
    });
    expect(ask.runId).toEqual(expect.any(String));

    const finished = await events.waitFor((event) => event.type === 'run.finished' && event.run.id === ask.runId);
    expect(finished).toMatchObject({ type: 'run.finished', status: 'completed' });
    const systemMessage = modelClient.calls[0]?.messages.find((message) => message.role === 'system');
    expect(systemMessage?.content).toContain('## Skills');
    expect(systemMessage?.content).toContain(
      '- daemon-local-skill: Daemon local skill - Loaded by daemon from workspace settings.'
    );
    expect(events.items.map((event) => event.type)).toEqual(
      expect.arrayContaining(['state.changed', 'run.started', 'message.appended', 'run.finished'])
    );

    const restored = await client.request<DaemonChatGetResult>('chat.get', { chatId: created.chat.id });
    expect(restored.chat).toMatchObject({
      id: created.chat.id,
      lastAnswer: 'Daemon final answer.',
      busy: false,
      messages: [
        { role: 'user', content: 'Hello daemon' },
        { role: 'assistant', content: 'Daemon final answer.' }
      ]
    });
    const finalState = await client.request<DaemonState>('state.get');
    expect(finalState.activeRun).toBeNull();
    expect(finalState.activeRuns).toEqual([]);
  });

  it('sends active prompt preset instructions and mode to the model system prompt', async () => {
    const modelClient = createQueuedModelClient([{ role: 'assistant', content: 'Preset applied.' }]);
    const { server, workspaceRoot, homeDir } = await startDaemon(modelClient);
    fs.mkdirSync(path.join(workspaceRoot, '.aist-agent'), { recursive: true });
    fs.mkdirSync(path.join(homeDir, '.aist-agent'), { recursive: true });
    fs.writeFileSync(
      globalSettingsFile(homeDir),
      `${JSON.stringify({
        instructions: [{ id: 'global-quality', label: 'Global quality', content: 'Always mention changed files.' }],
        modes: [{ id: 'careful-coder', label: 'Careful coder', instructions: 'Work in small safe steps.' }],
        presets: [
          {
            id: 'safe-coding',
            label: 'Safe coding',
            instructionRefs: [{ scope: 'global', id: 'global-quality' }],
            modeRef: { scope: 'global', id: 'careful-coder' },
            scope: 'global'
          }
        ]
      })}\n`,
      'utf8'
    );
    fs.writeFileSync(
      workspaceSettingsFile(workspaceRoot),
      `${JSON.stringify({
        instructions: [
          { id: 'project-tests', label: 'Project tests', content: 'Run unit tests after prompt changes.' }
        ],
        activeInstructionRefs: [
          { scope: 'global', id: 'global-quality' },
          { scope: 'local', id: 'project-tests' }
        ],
        activeModeRef: { scope: 'global', id: 'careful-coder' },
        activePresetId: 'safe-coding'
      })}\n`,
      'utf8'
    );

    const client = await connectClient(server);
    const events = createEventCollector(client);
    await client.subscribe();
    const created = await client.request<DaemonChatCreateResult>('chat.create', { model: 'fake-model' });
    const ask = await client.request<DaemonChatAskResult>('chat.ask', {
      chatId: created.chat.id,
      prompt: 'Check preset instructions'
    });

    await events.waitFor((event) => event.type === 'run.finished' && event.run.id === ask.runId);
    const systemMessage = modelClient.calls[0]?.messages.find((message) => message.role === 'system');
    expect(systemMessage?.content).toContain('## Global instruction: Global quality');
    expect(systemMessage?.content).toContain('Always mention changed files.');
    expect(systemMessage?.content).toContain('## Project instruction: Project tests');
    expect(systemMessage?.content).toContain('Run unit tests after prompt changes.');
    expect(systemMessage?.content).toContain('## Global mode: Careful coder');
    expect(systemMessage?.content).toContain('Work in small safe steps.');
  });

  it('runs chats in parallel while a reconnected client can read active runs', async () => {
    const firstResponse = createDeferred<OpenRouterMessage>();
    const secondResponse = createDeferred<OpenRouterMessage>();
    const responses = [firstResponse, secondResponse];
    const { server } = await startDaemon({
      chat: async () => {
        const next = responses.shift();
        if (!next) {
          throw new Error('Unexpected fake model request.');
        }
        return next.promise;
      }
    });
    const firstClient = await connectClient(server);
    const firstEvents = createEventCollector(firstClient);
    await firstClient.subscribe();
    const firstChat = await firstClient.request<DaemonChatCreateResult>('chat.create', { model: 'fake-model' });
    const secondChat = await firstClient.request<DaemonChatCreateResult>('chat.create', { model: 'fake-model' });

    const firstAsk = await firstClient.request<DaemonChatAskResult>('chat.ask', {
      chatId: firstChat.chat.id,
      prompt: 'Keep running'
    });
    expect(firstAsk.runId).toEqual(expect.any(String));

    const secondClient = await connectClient(server);
    const activeState = await secondClient.request<DaemonState>('state.get');
    expect(activeState.activeRun).toEqual({ runId: firstAsk.runId, chatId: firstChat.chat.id });
    expect(activeState.activeRuns).toEqual([{ runId: firstAsk.runId, chatId: firstChat.chat.id }]);

    const secondAsk = await secondClient.request<DaemonChatAskResult>('chat.ask', {
      chatId: secondChat.chat.id,
      prompt: 'Concurrent prompt'
    });
    expect(secondAsk.runId).toEqual(expect.any(String));
    expect(secondAsk.runId).not.toBe(firstAsk.runId);

    await expect(
      secondClient.request('chat.ask', {
        chatId: firstChat.chat.id,
        prompt: 'Same chat prompt'
      })
    ).rejects.toMatchObject({
      data: {
        code: DAEMON_BUSY_ERROR_CODE
      }
    } satisfies Partial<DaemonJsonRpcError>);

    secondClient.close();
    const reconnectedClient = await connectClient(server);
    const reconnectedState = await reconnectedClient.request<DaemonState>('state.get');
    expect(reconnectedState.activeRuns).toEqual(
      expect.arrayContaining([
        { runId: firstAsk.runId, chatId: firstChat.chat.id },
        { runId: secondAsk.runId, chatId: secondChat.chat.id }
      ])
    );
    expect(reconnectedState.chats.map((chat) => chat.id)).toEqual(
      expect.arrayContaining([firstChat.chat.id, secondChat.chat.id])
    );

    firstResponse.resolve({ role: 'assistant', content: 'First finished after reconnect.' });
    await firstEvents.waitFor((event) => event.type === 'run.finished' && event.run.id === firstAsk.runId);
    const oneStillRunning = await reconnectedClient.request<DaemonState>('state.get');
    expect(oneStillRunning.activeRuns).toEqual([{ runId: secondAsk.runId, chatId: secondChat.chat.id }]);

    secondResponse.resolve({ role: 'assistant', content: 'Second finished after reconnect.' });
    await firstEvents.waitFor((event) => event.type === 'run.finished' && event.run.id === secondAsk.runId);
    const finalState = await reconnectedClient.request<DaemonState>('state.get');
    expect(finalState.activeRun).toBeNull();
    expect(finalState.activeRuns).toEqual([]);
  });

  it('uses registered client capabilities for editable diff approvals', async () => {
    const { server } = await startDaemon(
      createQueuedModelClient([
        {
          role: 'assistant',
          content: '',
          tool_calls: [
            {
              id: 'tool-1',
              type: 'function',
              function: {
                name: 'write_file',
                arguments: JSON.stringify({
                  reason: 'create a file',
                  nextStep: 'verify preview',
                  path: 'hello.txt',
                  content: 'hello from preview'
                })
              }
            }
          ]
        },
        {
          role: 'assistant',
          content: 'Edited through preview.'
        }
      ])
    );
    const client = await connectClient(server);
    const events = createEventCollector(client);
    const clientRequests: string[] = [];

    client.onRequest('client.notification', async () => {
      clientRequests.push('notification');
      return { shown: true };
    });
    client.onRequest('client.previewEdit.prepare', async (params) => {
      clientRequests.push(`prepare:${params.toolName}:${params.previewId}`);
      return {
        preview: {
          ok: true,
          path: params.args.path,
          diffShown: true,
          editable: true
        }
      };
    });
    client.onRequest('client.previewEdit.approve', async (params) => {
      clientRequests.push(`approve:${params.previewId}`);
      return {
        ok: true,
        path: 'hello.txt',
        bytes: 18
      };
    });
    client.onRequest('client.previewEdit.cleanup', async (params) => {
      clientRequests.push(`cleanup:${params.previewId}`);
      return { ok: true };
    });
    client.onEvent((event) => {
      if (event.type === 'tool.call.approvalRequested') {
        void client.request('approval.resolve', {
          messageId: event.messageId,
          approved: true
        });
      }
    });

    await client.request('client.capabilities', {
      capabilities: {
        notifications: true,
        vscodeEditableDiffPreview: true
      }
    });
    await client.subscribe();
    const created = await client.request<DaemonChatCreateResult>('chat.create', { model: 'fake-model' });
    const ask = await client.request<DaemonChatAskResult>('chat.ask', {
      chatId: created.chat.id,
      prompt: 'Write a file'
    });

    await events.waitFor((event) => event.type === 'run.finished' && event.run.id === ask.runId);
    const restored = await client.request<DaemonChatGetResult>('chat.get', { chatId: created.chat.id });
    const toolMessage = restored.chat.messages.find((message) => message.role === 'tool');
    expect(toolMessage).toMatchObject({
      name: 'write_file',
      status: 'done',
      approval: 'approved',
      result: {
        preview: {
          editable: true,
          path: 'hello.txt'
        },
        result: {
          ok: true,
          path: 'hello.txt',
          bytes: 18
        }
      }
    });
    expect(clientRequests.some((item) => item.startsWith('prepare:write_file:'))).toBe(true);
    expect(clientRequests.some((item) => item.startsWith('approve:'))).toBe(true);
    expect(clientRequests.some((item) => item.startsWith('cleanup:'))).toBe(true);
    expect(clientRequests).toContain('notification');
  });

  it('serves autonomous state and dry-run flow events without changing chat activeRun', async () => {
    const { server, workspaceRoot, homeDir } = await startDaemon(createQueuedModelClient([]));
    createNativeAutonomousFlow(workspaceRoot, 'demo-flow');
    const client = await connectClient(server);
    const events = createEventCollector(client);
    await client.subscribe();

    const state = await client.request<DaemonAutonomousStateResult>('autonomous.state');
    expect(state.state.definitions.flows.map((flow) => flow.id)).toContain('demo-flow');
    expect(state.state.storageRoot).toBe(globalWorkspaceAutonomousSessionsDir(workspaceRoot, homeDir));

    const start = await client.request<DaemonAutonomousStartResult>('autonomous.flow.start', {
      flowId: 'demo-flow',
      launch: { engineId: 'dry-run', dryRun: true }
    });
    expect(start).toMatchObject({
      accepted: true,
      kind: 'flow',
      targetId: 'demo-flow'
    });

    await events.waitFor(
      (event) =>
        event.type === 'autonomous.session.finished' &&
        event.sessionId === start.sessionId &&
        event.status === 'finished'
    );
    expect(
      events.items.some(
        (event) =>
          event.type === 'autonomous.event' && event.sessionId === start.sessionId && event.event.action === 'DRY'
      )
    ).toBe(true);

    const exported = await client.request<DaemonAutonomousExportResult>('autonomous.export', {
      sessionId: start.sessionId,
      format: 'json'
    });
    expect(JSON.parse(exported.content)).toMatchObject({
      meta: {
        id: start.sessionId,
        status: 'finished'
      }
    });
    const finalState = await client.request<DaemonState>('state.get');
    expect(finalState.activeRun).toBeNull();
    expect(finalState.activeRuns).toEqual([]);
  });
});

async function startDaemon(
  modelClient: ModelClient
): Promise<{ server: AistDaemonServer; workspaceRoot: string; homeDir: string }> {
  const workspaceRoot = createTempDir('aist-daemon-workspace-');
  const homeDir = createTempDir('aist-daemon-home-');
  const server = new AistDaemonServer({ workspaceRoot, homeDir, modelClient });
  await server.start();
  servers.push(server);
  return { server, workspaceRoot, homeDir };
}

async function connectClient(server: AistDaemonServer): Promise<DaemonJsonRpcClient> {
  const client = await DaemonJsonRpcClient.connect({ socketPath: server.socketPath });
  clients.push(client);
  return client;
}

function createTempDir(prefix: string): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(tempDir);
  return tempDir;
}

function createNativeAutonomousFlow(workspaceRoot: string, flowId: string): void {
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

type QueuedDaemonModelClient = ModelClient & {
  calls: Array<{ messages: OpenRouterMessage[] }>;
};

function createQueuedModelClient(responses: OpenRouterMessage[]): QueuedDaemonModelClient {
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

function createDeferred<T>(): {
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

function createEventCollector(client: DaemonJsonRpcClient): {
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
