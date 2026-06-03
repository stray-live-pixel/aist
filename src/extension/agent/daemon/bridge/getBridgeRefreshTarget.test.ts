import { describe, expect, it } from 'vitest';

import type { DaemonEvent } from '../../../../cli/daemonProtocol';
import { getBridgeRefreshTarget } from './getBridgeRefreshTarget';

describe('getBridgeRefreshTarget', () => {
  it('selects chat refresh for state.changed with chatId', () => {
    const event: DaemonEvent = {
      type: 'state.changed',
      workspaceRoot: '/workspace',
      reason: 'run.activity',
      chatId: 'chat-state',
      activeRun: null,
      activeRuns: [],
      at: 1000
    };

    expect(getBridgeRefreshTarget({ event })).toEqual({ kind: 'chat', chatId: 'chat-state' });
  });

  it('selects chat refresh for run.activity with chatId', () => {
    const event: DaemonEvent = {
      type: 'run.activity',
      runId: 'run-1',
      chatId: 'chat-activity',
      activity: 'thinking',
      at: 1000
    };

    expect(getBridgeRefreshTarget({ event })).toEqual({ kind: 'chat', chatId: 'chat-activity' });
  });

  it('selects chat refresh for run.finished with run.chatId', () => {
    const event: DaemonEvent = {
      type: 'run.finished',
      run: {
        id: 'run-1',
        chatId: 'chat-finished',
        status: 'completed',
        startedAt: 1000,
        finishedAt: 2000
      },
      status: 'completed',
      at: 2000
    };

    expect(getBridgeRefreshTarget({ event })).toEqual({ kind: 'chat', chatId: 'chat-finished' });
  });

  it('selects state refresh for lifecycle events without chat context', () => {
    const event: DaemonEvent = {
      type: 'state.changed',
      workspaceRoot: '/workspace',
      reason: 'config.update',
      activeRun: null,
      activeRuns: [],
      at: 1000
    };

    expect(getBridgeRefreshTarget({ event })).toEqual({ kind: 'state' });
  });
});
