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
});
