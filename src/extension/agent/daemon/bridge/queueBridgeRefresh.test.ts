import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DaemonEvent } from '../../../../cli/daemonProtocol';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import { queueBridgeChatRefresh } from './queueBridgeChatRefresh';
import { queueBridgeRefresh } from './queueBridgeRefresh';
import { queueBridgeStateRefresh } from './queueBridgeStateRefresh';

vi.mock('./queueBridgeChatRefresh', () => ({
  queueBridgeChatRefresh: vi.fn()
}));

vi.mock('./queueBridgeStateRefresh', () => ({
  queueBridgeStateRefresh: vi.fn()
}));

describe('queueBridgeRefresh', () => {
  beforeEach(() => {
    vi.mocked(queueBridgeChatRefresh).mockReset();
    vi.mocked(queueBridgeStateRefresh).mockReset();
  });

  it('queues state refresh for autonomous state changes', () => {
    const context = createContext();
    const event: DaemonEvent = {
      type: 'autonomous.state.changed',
      workspaceRoot: '/workspace',
      reason: 'autonomous.flow.save',
      at: 1000
    };

    queueBridgeRefresh({ context, event });

    expect(queueBridgeStateRefresh).toHaveBeenCalledWith({ context, event });
    expect(queueBridgeChatRefresh).not.toHaveBeenCalled();
  });

  it('ignores noisy autonomous run events', () => {
    const context = createContext();
    const event: DaemonEvent = {
      type: 'autonomous.event',
      workspaceRoot: '/workspace',
      sessionId: 'session-1',
      event: {
        id: 'event-1',
        ts: '2026-01-01T00:00:00.000Z',
        level: 'info',
        action: 'STAGE',
        message: 'Running'
      }
    };

    queueBridgeRefresh({ context, event });

    expect(queueBridgeStateRefresh).not.toHaveBeenCalled();
    expect(queueBridgeChatRefresh).not.toHaveBeenCalled();
  });
});

function createContext(): BridgeRuntimeContext {
  return {
    state: { disposed: false },
    logger: {} as never
  } as unknown as BridgeRuntimeContext;
}
