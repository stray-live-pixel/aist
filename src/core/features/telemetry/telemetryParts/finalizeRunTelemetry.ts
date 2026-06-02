import { AgentRunTelemetryDraft } from './AgentRunTelemetryDraft';
import { AgentRunTelemetryRecord } from './AgentRunTelemetryRecord';
import { MAX_TELEMETRY_RECORDS } from './MAX_TELEMETRY_RECORDS';
import { RunTelemetryStatus } from './RunTelemetryStatus';
import { TELEMETRY_SCHEMA_VERSION } from './TELEMETRY_SCHEMA_VERSION';
import { pruneTelemetryFiles } from './pruneTelemetryFiles';
import { sortRecord } from './sortRecord';
import { sortRecords } from './sortRecords';
import { telemetryState } from './telemetryState';
import { writeTelemetryRecord } from './writeTelemetryRecord';

export function finalizeRunTelemetry(
  draft: AgentRunTelemetryDraft | undefined,
  status: RunTelemetryStatus,
  finishedAt = Date.now()
): AgentRunTelemetryRecord | undefined {
  if (!draft) {
    return undefined;
  }

  const record: AgentRunTelemetryRecord = {
    schemaVersion: TELEMETRY_SCHEMA_VERSION,
    ...draft,
    finishedAt,
    durationMs: Math.max(0, finishedAt - draft.startedAt),
    status,
    toolCallsByType: sortRecord(draft.toolCallsByType)
  };
  telemetryState.recordsCache = sortRecords([
    record,
    ...telemetryState.recordsCache.filter((item) => item.runId !== record.runId)
  ]).slice(0, MAX_TELEMETRY_RECORDS);
  writeTelemetryRecord(record);
  pruneTelemetryFiles();
  return record;
}
