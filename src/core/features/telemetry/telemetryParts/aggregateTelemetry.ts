import { AgentRunTelemetryRecord } from './AgentRunTelemetryRecord';
import { AgentTelemetryAggregates } from './AgentTelemetryAggregates';
import { sortRecord } from './sortRecord';

export function aggregateTelemetry(records: AgentRunTelemetryRecord[]): AgentTelemetryAggregates {
  const base: AgentTelemetryAggregates = {
    runCount: records.length,
    successCount: 0,
    errorCount: 0,
    stoppedCount: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    toolCallCount: 0,
    repeatedToolCalls: 0,
    failedEdits: 0,
    approvals: { requested: 0, approved: 0, denied: 0 },
    contextBytes: 0,
    averageDurationMs: 0,
    toolCallsByType: {}
  };
  let durationTotal = 0;
  let firstEditLatencyTotal = 0;
  let firstEditLatencyCount = 0;

  for (const record of records) {
    if (record.status === 'success') base.successCount += 1;
    if (record.status === 'error') base.errorCount += 1;
    if (record.status === 'stopped') base.stoppedCount += 1;
    base.promptTokens += record.promptTokens;
    base.completionTokens += record.completionTokens;
    base.totalTokens += record.totalTokens;
    base.toolCallCount += record.toolCallCount;
    base.repeatedToolCalls += record.repeatedToolCalls;
    base.failedEdits += record.failedEdits;
    base.approvals.requested += record.approvals.requested;
    base.approvals.approved += record.approvals.approved;
    base.approvals.denied += record.approvals.denied;
    base.contextBytes += record.contextBytes;
    durationTotal += record.durationMs;
    if (record.firstEditLatencyMs !== undefined) {
      firstEditLatencyTotal += record.firstEditLatencyMs;
      firstEditLatencyCount += 1;
    }
    for (const [toolName, count] of Object.entries(record.toolCallsByType)) {
      base.toolCallsByType[toolName] = (base.toolCallsByType[toolName] || 0) + count;
    }
  }

  base.averageDurationMs = records.length ? Math.round(durationTotal / records.length) : 0;
  base.averageFirstEditLatencyMs = firstEditLatencyCount
    ? Math.round(firstEditLatencyTotal / firstEditLatencyCount)
    : undefined;
  base.toolCallsByType = sortRecord(base.toolCallsByType);
  return base;
}
