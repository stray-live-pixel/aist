import { describe, expect, it } from 'vitest';

import type { PerformanceTelemetryRecord } from './PerformanceTelemetryRecord';
import { aggregatePerformanceByOperation, aggregatePerformanceTelemetry } from './aggregatePerformanceTelemetry';

describe('aggregatePerformanceTelemetry', () => {
  it('groups records by operation with avg, p95, max and render counters', () => {
    const buckets = aggregatePerformanceByOperation([
      createRecord({ id: 'slow', operation: 'webview.render', durationMs: 100, renderCount: 4 }),
      createRecord({ id: 'medium', operation: 'webview.render', durationMs: 20, renderCount: 2 }),
      createRecord({ id: 'fast', operation: 'webview.render', durationMs: 10, renderCount: 1 }),
      createRecord({ id: 'request', operation: 'agent.request', durationMs: 50 })
    ]);

    const renderBucket = buckets.find((bucket) => bucket.operation === 'webview.render');

    expect(renderBucket).toMatchObject({
      key: 'webview.render',
      count: 3,
      averageDurationMs: 43,
      p95DurationMs: 100,
      maxDurationMs: 100,
      totalDurationMs: 130,
      averageRenderCount: 2,
      totalRenderCount: 7
    });
    expect(buckets.find((bucket) => bucket.operation === 'agent.request')).toMatchObject({
      count: 1,
      averageDurationMs: 50
    });
  });

  it('keeps the slowest buckets first and respects limit', () => {
    const buckets = aggregatePerformanceTelemetry({
      records: [
        createRecord({ id: 'chat', chatId: 'chat-1', durationMs: 10 }),
        createRecord({ id: 'chat-slow', chatId: 'chat-2', durationMs: 90 }),
        createRecord({ id: 'chat-medium', chatId: 'chat-3', durationMs: 40 })
      ],
      getKey: (record) => record.chatId || 'global',
      getLabel: (_record, key) => key,
      limit: 2
    });

    expect(buckets.map((bucket) => bucket.key)).toEqual(['chat-2', 'chat-3']);
  });
});

function createRecord(input: {
  id: string;
  operation?: PerformanceTelemetryRecord['operation'];
  chatId?: string;
  durationMs: number;
  renderCount?: number;
}): PerformanceTelemetryRecord {
  return {
    schemaVersion: 1,
    id: input.id,
    operation: input.operation || 'agent.request',
    extensionVersion: '0.0.18',
    chatId: input.chatId,
    startedAt: 1_700_000_000_000,
    finishedAt: 1_700_000_000_000 + input.durationMs,
    durationMs: input.durationMs,
    status: 'success',
    renderCount: input.renderCount
  };
}
