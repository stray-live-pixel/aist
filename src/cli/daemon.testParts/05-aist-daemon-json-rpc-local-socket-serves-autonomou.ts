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
