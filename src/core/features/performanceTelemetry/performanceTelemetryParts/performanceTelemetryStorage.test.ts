import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MAX_PERFORMANCE_TELEMETRY_RECORDS } from './MAX_PERFORMANCE_TELEMETRY_RECORDS';
import type { PerformanceTelemetryRecord } from './PerformanceTelemetryRecord';
import { initializePerformanceTelemetryStore } from './initializePerformanceTelemetryStore';
import { normalizePerformanceTelemetryRecord } from './normalizePerformanceTelemetryRecord';
import { performanceTelemetryState } from './performanceTelemetryState';
import { readPerformanceTelemetryRecords } from './readPerformanceTelemetryRecords';
import { recordPerformanceTelemetry } from './recordPerformanceTelemetry';

describe('performance telemetry storage', () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aist-performance-telemetry-'));
    performanceTelemetryState.directory = undefined;
    performanceTelemetryState.recordsCache = [];
  });

  afterEach(() => {
    performanceTelemetryState.directory = undefined;
    performanceTelemetryState.recordsCache = [];
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('writes records to fallback storage and reloads them after initialization', () => {
    initializePerformanceTelemetryStore({ fallbackRoot: tempRoot });

    recordPerformanceTelemetry({
      id: 'request-1',
      operation: 'agent.request',
      extensionVersion: '0.0.18',
      workspaceRoot: '/workspace',
      chatId: 'chat-1',
      startedAt: 1000,
      finishedAt: 1250,
      status: 'success'
    });

    expect(performanceTelemetryState.recordsCache).toHaveLength(1);
    performanceTelemetryState.recordsCache = [];
    initializePerformanceTelemetryStore({ fallbackRoot: tempRoot });

    expect(performanceTelemetryState.recordsCache).toHaveLength(1);
    expect(performanceTelemetryState.recordsCache[0]).toMatchObject({
      id: 'request-1',
      operation: 'agent.request',
      durationMs: 250,
      chatId: 'chat-1'
    });
  });

  it('ignores invalid json and strips unsafe meta fields while reading records', () => {
    const directory = path.join(tempRoot, 'performance-telemetry');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'broken.json'), '{not-json', 'utf8');
    fs.writeFileSync(
      path.join(directory, 'valid.json'),
      JSON.stringify({
        ...createRecord({ id: 'valid', durationMs: -5 }),
        meta: { component: 'ChatPage', nested: { secret: 'nope' }, ok: true }
      }),
      'utf8'
    );

    const records = readPerformanceTelemetryRecords(directory);

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ id: 'valid', durationMs: 0, meta: { component: 'ChatPage', ok: true } });
  });

  it('prunes files beyond retained cache limit', () => {
    initializePerformanceTelemetryStore({ fallbackRoot: tempRoot });

    for (let index = 0; index < MAX_PERFORMANCE_TELEMETRY_RECORDS + 2; index += 1) {
      recordPerformanceTelemetry({
        id: `record-${index}`,
        operation: 'webview.patch',
        extensionVersion: '0.0.18',
        startedAt: 1000 + index,
        finishedAt: 1010 + index,
        status: 'success'
      });
    }

    const directory = path.join(tempRoot, 'performance-telemetry');
    const jsonFiles = fs.readdirSync(directory).filter((fileName) => fileName.endsWith('.json'));

    expect(performanceTelemetryState.recordsCache).toHaveLength(MAX_PERFORMANCE_TELEMETRY_RECORDS);
    expect(jsonFiles).toHaveLength(MAX_PERFORMANCE_TELEMETRY_RECORDS);
  });

  it('normalizes only supported operation records', () => {
    expect(normalizePerformanceTelemetryRecord(createRecord({ id: 'ok', durationMs: 10 }))?.operation).toBe(
      'agent.request'
    );
    expect(
      normalizePerformanceTelemetryRecord({ ...createRecord({ id: 'bad', durationMs: 10 }), operation: 'unknown' })
    ).toBeUndefined();
  });
});

function createRecord(input: { id: string; durationMs: number }): PerformanceTelemetryRecord {
  return {
    schemaVersion: 1,
    id: input.id,
    operation: 'agent.request',
    extensionVersion: '0.0.18',
    startedAt: 1000,
    finishedAt: 1000 + input.durationMs,
    durationMs: input.durationMs,
    status: 'success'
  };
}
