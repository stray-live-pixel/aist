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
    const toolMessage = restored.chat.messages.find(
      (message) => message.role === 'tool' && message.name === 'write_file'
    );
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
});
