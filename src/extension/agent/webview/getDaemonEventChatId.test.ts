import { describe, expect, it } from 'vitest';

import type { DaemonEvent } from '../../../cli/daemonProtocol';
import { getDaemonEventChatId } from './getDaemonEventChatId';

describe('getDaemonEventChatId', () => {
  it('reads chatId from top-level runtime events', () => {
    const event: DaemonEvent = {
      type: 'run.activity',
      runId: 'run-1',
      chatId: 'chat-1',
      activity: 'thinking',
      at: 1000
    };

    expect(getDaemonEventChatId(event)).toBe('chat-1');
  });

  it('reads chatId from run.started snapshot events', () => {
    const event: DaemonEvent = {
      type: 'run.started',
      run: {
        id: 'run-1',
        chatId: 'chat-2',
        status: 'running',
        startedAt: 1000
      },
      at: 1000
    };

    expect(getDaemonEventChatId(event)).toBe('chat-2');
  });

  it('reads chatId from run.finished snapshot events', () => {
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

    expect(getDaemonEventChatId(event)).toBe('chat-finished');
  });

  it('reads chatId from state.changed events after chat create', () => {
    const event: DaemonEvent = {
      type: 'state.changed',
      workspaceRoot: '/workspace',
      reason: 'chat.create',
      chatId: 'chat-created',
      activeRun: null,
      activeRuns: [],
      at: 1000
    };

    expect(getDaemonEventChatId(event)).toBe('chat-created');
  });

  it('returns undefined for state.changed events without chat context', () => {
    const event: DaemonEvent = {
      type: 'state.changed',
      workspaceRoot: '/workspace',
      reason: 'config.update',
      activeRun: null,
      activeRuns: [],
      at: 1000
    };

    expect(getDaemonEventChatId(event)).toBeUndefined();
  });
});
