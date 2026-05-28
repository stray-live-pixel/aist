import { describe, expect, expectTypeOf, it } from 'vitest';

import type { JsonObject, RuntimeEvent, RuntimeEventType } from './types';

const runtimeEventTypes = [
  'run.started',
  'run.activity',
  'run.completed',
  'run.failed',
  'run.stopped',
  'message.appended',
  'model.request.updated',
  'model.response',
  'tool.call.started',
  'tool.call.approvalRequested',
  'tool.call.approvalResolved',
  'tool.call.completed',
  'tool.call.failed'
] as const satisfies readonly RuntimeEventType[];

type ExpectedRuntimeEventType = (typeof runtimeEventTypes)[number];

describe('core runtime contracts', () => {
  it('keeps RuntimeEvent as an exhaustive discriminated union', () => {
    expectTypeOf<RuntimeEventType>().toEqualTypeOf<ExpectedRuntimeEventType>();
    expectTypeOf<Extract<RuntimeEvent, { type: 'tool.call.approvalRequested' }>>().toMatchTypeOf<{
      approvalId: string;
      messageId: string;
      toolCall: { args: JsonObject };
    }>();
    expectTypeOf<Extract<RuntimeEvent, { type: 'model.request.updated' }>>().toMatchTypeOf<{
      request: { requestNumber: number; phase: string };
    }>();
    expectTypeOf<Extract<RuntimeEvent, { type: 'model.response' }>>().toMatchTypeOf<{
      message: { tool_calls?: Array<{ function: { arguments?: string | JsonObject } }> };
    }>();

    const event: RuntimeEvent = {
      type: 'run.started',
      at: 100,
      run: {
        id: 'run-1',
        chatId: 'chat-1',
        status: 'running',
        startedAt: 100
      }
    };

    expect(getEventKind(event)).toBe('run.started');
  });
});

function getEventKind(event: RuntimeEvent): RuntimeEventType {
  switch (event.type) {
    case 'run.started':
    case 'run.activity':
    case 'run.completed':
    case 'run.failed':
    case 'run.stopped':
    case 'message.appended':
    case 'model.request.updated':
    case 'model.response':
    case 'tool.call.started':
    case 'tool.call.approvalRequested':
    case 'tool.call.approvalResolved':
    case 'tool.call.completed':
    case 'tool.call.failed':
      return event.type;
    default:
      return assertNever(event);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled runtime event: ${String(value)}`);
}
