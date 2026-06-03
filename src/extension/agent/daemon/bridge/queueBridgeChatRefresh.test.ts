import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DaemonEvent } from '../../../../cli/daemonProtocol';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import { queueBridgeChatRefresh } from './queueBridgeChatRefresh';
import { runBridgeRefreshForEvent } from './runBridgeRefreshForEvent';

vi.mock('./runBridgeRefreshForEvent', () => ({
  runBridgeRefreshForEvent: vi.fn()
}));

describe('queueBridgeChatRefresh', () => {
  beforeEach(() => {
    vi.mocked(runBridgeRefreshForEvent).mockReset();
  });

  it('runs refreshes for different chats independently', async () => {
    const context = createContext();
    const first = createDeferred<void>();
    const second = createDeferred<void>();
    vi.mocked(runBridgeRefreshForEvent).mockImplementation(({ target }) =>
      target.kind === 'chat' && target.chatId === 'chat-a' ? first.promise : second.promise
    );

    queueBridgeChatRefresh({ context, event: createEvent({ chatId: 'chat-a' }), chatId: 'chat-a' });
    queueBridgeChatRefresh({ context, event: createEvent({ chatId: 'chat-b' }), chatId: 'chat-b' });
    await flushMicrotasks();

    expect(runBridgeRefreshForEvent).toHaveBeenCalledTimes(2);
    expect(context.state.refreshQueuesByChatId.has('chat-a')).toBe(true);
    expect(context.state.refreshQueuesByChatId.has('chat-b')).toBe(true);

    first.resolve();
    second.resolve();
    await Promise.all([...context.state.refreshQueuesByChatId.values()]);
  });

  it('coalesces repeated events for the same chat while refresh is pending', async () => {
    const context = createContext();
    const pending = createDeferred<void>();
    vi.mocked(runBridgeRefreshForEvent).mockReturnValue(pending.promise);

    for (let index = 0; index < 5; index += 1) {
      queueBridgeChatRefresh({ context, event: createEvent({ chatId: 'chat-a' }), chatId: 'chat-a' });
    }
    await flushMicrotasks();

    expect(runBridgeRefreshForEvent).toHaveBeenCalledTimes(1);

    pending.resolve();
    await Promise.all([...context.state.refreshQueuesByChatId.values()]);
  });

  it('keeps later refreshes of the same chat sequential after the previous one finished', async () => {
    const context = createContext();
    const order: string[] = [];
    vi.mocked(runBridgeRefreshForEvent).mockImplementation(async ({ event }) => {
      order.push(event.type);
    });

    queueBridgeChatRefresh({
      context,
      event: createEvent({ chatId: 'chat-a', type: 'run.activity' }),
      chatId: 'chat-a'
    });
    await Promise.all([...context.state.refreshQueuesByChatId.values()]);
    queueBridgeChatRefresh({
      context,
      event: createEvent({ chatId: 'chat-a', type: 'model.request.updated' }),
      chatId: 'chat-a'
    });
    await Promise.all([...context.state.refreshQueuesByChatId.values()]);

    expect(order).toEqual(['run.activity', 'model.request.updated']);
  });

  it('does not block another chat when one chat refresh fails', async () => {
    const context = createContext();
    vi.mocked(runBridgeRefreshForEvent).mockImplementation(({ target }) => {
      if (target.kind === 'chat' && target.chatId === 'chat-a') {
        return Promise.reject(new Error('chat-a failed'));
      }
      return Promise.resolve();
    });

    queueBridgeChatRefresh({ context, event: createEvent({ chatId: 'chat-a' }), chatId: 'chat-a' });
    queueBridgeChatRefresh({ context, event: createEvent({ chatId: 'chat-b' }), chatId: 'chat-b' });
    await Promise.all([...context.state.refreshQueuesByChatId.values()]);

    expect(runBridgeRefreshForEvent).toHaveBeenCalledTimes(2);
    expect(context.logger.error).toHaveBeenCalledTimes(1);
  });
});

function createContext(): BridgeRuntimeContext {
  return {
    state: {
      client: undefined,
      eventListeners: new Set(),
      beforeStoreRefreshListeners: new Set(),
      subagentRunsByParentChat: new Map(),
      lastSyncedSettings: '',
      refreshQueue: Promise.resolve(),
      refreshQueuesByChatId: new Map(),
      pendingChatRefreshes: new Set(),
      disposed: false,
      previewHandles: new Map(),
      agentRequestStartedAtByRunId: new Map()
    },
    logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), show: vi.fn(), dispose: vi.fn() },
    extensionContext: {} as never,
    processManager: {} as never,
    workspaceRoot: '/workspace',
    defaultModel: 'model',
    chats: {} as never,
    activeEditorContextProvider: {} as never,
    previewEditProvider: {} as never,
    notifier: {} as never
  } as BridgeRuntimeContext;
}

function createEvent({ chatId, type = 'run.activity' }: { chatId: string; type?: DaemonEvent['type'] }): DaemonEvent {
  if (type === 'model.request.updated') {
    return {
      type,
      runId: `run-${chatId}`,
      chatId,
      request: {
        model: 'model',
        attempt: 1,
        maxAttempts: 1,
        requestNumber: 1,
        phase: 'sending',
        stream: false,
        startedAt: 1000,
        updatedAt: 1000
      },
      at: 1000
    };
  }

  return {
    type: 'run.activity',
    runId: `run-${chatId}`,
    chatId,
    activity: 'thinking',
    at: 1000
  };
}

function createDeferred<T>(): { promise: Promise<T>; resolve(value: T): void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
