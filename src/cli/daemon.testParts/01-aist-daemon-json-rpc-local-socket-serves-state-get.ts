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
import {
  QueuedDaemonModelClient,
  clients,
  connectClient,
  createDeferred,
  createEventCollector,
  createNativeAutonomousFlow,
  createQueuedModelClient,
  createTempDir,
  servers,
  startDaemon,
  tempDirs
} from './helpers';

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
      busy: false
    });
    expect(restored.chat.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'user', content: 'Hello daemon' }),
        expect.objectContaining({ role: 'tool', name: 'get_relevant_memory', status: 'done' }),
        expect.objectContaining({ role: 'assistant', content: 'Daemon final answer.' })
      ])
    );
    const finalState = await client.request<DaemonState>('state.get');
    expect(finalState.activeRun).toBeNull();
    expect(finalState.activeRuns).toEqual([]);
  });
});
