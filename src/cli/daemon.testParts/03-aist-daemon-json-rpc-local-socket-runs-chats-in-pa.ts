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
});
