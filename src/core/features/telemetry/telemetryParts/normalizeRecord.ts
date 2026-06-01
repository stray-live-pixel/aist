import { AgentRunTelemetryRecord } from './AgentRunTelemetryRecord';
import { TELEMETRY_SCHEMA_VERSION } from './TELEMETRY_SCHEMA_VERSION';
import { sortRecord } from './sortRecord';

export function normalizeRecord(record: Partial<AgentRunTelemetryRecord>): AgentRunTelemetryRecord {
  const startedAt = Number(record.startedAt) || Date.now();
  const finishedAt = Number(record.finishedAt) || startedAt;
  return {
    schemaVersion: TELEMETRY_SCHEMA_VERSION,
    runId: String(record.runId),
    chatId: String(record.chatId || ''),
    model: String(record.model || ''),
    startedAt,
    finishedAt,
    durationMs: Number(record.durationMs) || Math.max(0, finishedAt - startedAt),
    status: record.status === 'error' || record.status === 'stopped' ? record.status : 'success',
    promptTokens: Number(record.promptTokens) || 0,
    completionTokens: Number(record.completionTokens) || 0,
    totalTokens: Number(record.totalTokens) || 0,
    modelRequestCount: Number(record.modelRequestCount) || 0,
    toolCallCount: Number(record.toolCallCount) || 0,
    toolCallsByType: sortRecord(record.toolCallsByType || {}),
    repeatedToolCalls: Number(record.repeatedToolCalls) || 0,
    firstEditLatencyMs:
      record.firstEditLatencyMs === undefined ? undefined : Math.max(0, Number(record.firstEditLatencyMs) || 0),
    failedEdits: Number(record.failedEdits) || 0,
    approvals: {
      requested: Number(record.approvals?.requested) || 0,
      approved: Number(record.approvals?.approved) || 0,
      denied: Number(record.approvals?.denied) || 0
    },
    contextBytes: Number(record.contextBytes) || 0
  };
}
