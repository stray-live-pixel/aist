import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  type AgentRunTelemetryRecord,
  aggregateTelemetry,
  createRunTelemetryDraft,
  exportTelemetryJson,
  exportTelemetryMarkdown,
  finalizeRunTelemetry,
  getTelemetryDashboardState,
  initializeTelemetryStore,
  recordApprovalDecision,
  recordApprovalRequested,
  recordContextBytes,
  recordFailedEdit,
  recordModelRequest,
  recordModelUsage,
  recordRepeatedToolCall,
  recordToolCalls,
  recordToolStarted
} from './telemetry';
import type { Chat } from './types';

const tempRoots: string[] = [];

describe('run telemetry aggregation', () => {
  afterEach(() => {
    for (const root of tempRoots) {
      fs.rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
    initializeTelemetryStore();
  });

  it('aggregates token, tool, approval, edit and context metrics', () => {
    const records: AgentRunTelemetryRecord[] = [
      {
        schemaVersion: 1,
        runId: 'run-1',
        chatId: 'chat-1',
        model: 'codex:gpt-5.1-codex',
        startedAt: 1000,
        finishedAt: 4000,
        durationMs: 3000,
        status: 'success',
        promptTokens: 100,
        completionTokens: 40,
        totalTokens: 140,
        modelRequestCount: 2,
        toolCallCount: 3,
        toolCallsByType: { read_file: 2, edit_file: 1 },
        repeatedToolCalls: 1,
        firstEditLatencyMs: 900,
        failedEdits: 0,
        approvals: { requested: 1, approved: 1, denied: 0 },
        contextBytes: 2048
      },
      {
        schemaVersion: 1,
        runId: 'run-2',
        chatId: 'chat-1',
        model: 'openai/gpt-4o-mini',
        startedAt: 5000,
        finishedAt: 9000,
        durationMs: 4000,
        status: 'error',
        promptTokens: 80,
        completionTokens: 10,
        totalTokens: 90,
        modelRequestCount: 1,
        toolCallCount: 1,
        toolCallsByType: { edit_file: 1 },
        repeatedToolCalls: 0,
        firstEditLatencyMs: 1200,
        failedEdits: 1,
        approvals: { requested: 1, approved: 0, denied: 1 },
        contextBytes: 1024
      }
    ];

    expect(aggregateTelemetry(records)).toEqual({
      runCount: 2,
      successCount: 1,
      errorCount: 1,
      stoppedCount: 0,
      promptTokens: 180,
      completionTokens: 50,
      totalTokens: 230,
      toolCallCount: 4,
      repeatedToolCalls: 1,
      failedEdits: 1,
      approvals: { requested: 2, approved: 1, denied: 1 },
      contextBytes: 3072,
      averageDurationMs: 3500,
      averageFirstEditLatencyMs: 1050,
      toolCallsByType: { edit_file: 2, read_file: 2 }
    });
  });

  it('persists sanitized run records and builds exports without raw payloads', () => {
    const workspaceRoot = createTempRoot();
    initializeTelemetryStore({ workspaceRoot });
    const draft = createRunTelemetryDraft(createChat(), 10_000);

    recordContextBytes(draft, 4096);
    recordModelRequest(draft);
    recordModelUsage(draft, { promptTokens: 123, completionTokens: 45, totalTokens: 168 });
    recordToolCalls(draft, ['read_file', 'edit_file', 'edit_file']);
    recordRepeatedToolCall(draft);
    recordToolStarted(draft, 'edit_file', 10_250);
    recordApprovalRequested(draft);
    recordApprovalDecision(draft, false);
    recordFailedEdit(draft, 'edit_file');

    const record = finalizeRunTelemetry(draft, 'stopped', 11_000);
    const dashboard = getTelemetryDashboardState();

    expect(record).toMatchObject({
      promptTokens: 123,
      completionTokens: 45,
      totalTokens: 168,
      toolCallCount: 3,
      toolCallsByType: { edit_file: 2, read_file: 1 },
      repeatedToolCalls: 1,
      firstEditLatencyMs: 250,
      failedEdits: 1,
      approvals: { requested: 1, approved: 0, denied: 1 },
      contextBytes: 4096,
      status: 'stopped'
    });
    expect(dashboard.storagePath).toBe(path.join(workspaceRoot, '.aist-agent', 'telemetry'));
    expect(dashboard.recentRuns).toHaveLength(1);
    expect(fs.readdirSync(dashboard.storagePath!)).toHaveLength(1);
    const json = exportTelemetryJson(dashboard);
    const markdown = exportTelemetryMarkdown(dashboard);
    expect(json).toContain('"exportKind": "aist.telemetry.v1"');
    expect(markdown).toContain('No raw prompts');
    expect(markdown).toContain('edit_file: 2');
  });
});

function createTempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aist-telemetry-'));
  tempRoots.push(root);
  return root;
}

function createChat(): Chat {
  return {
    id: 'chat-1',
    title: 'Telemetry chat',
    model: 'codex:gpt-5.1-codex',
    messages: [],
    history: [],
    lastAnswer: '',
    busy: false,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    createdAt: 0,
    updatedAt: 0
  };
}
