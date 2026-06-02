import fs from 'node:fs';
import path from 'node:path';

import { AgentRunTelemetryRecord } from './AgentRunTelemetryRecord';
import { telemetryState } from './telemetryState';

export function writeTelemetryRecord(record: AgentRunTelemetryRecord): void {
  if (!telemetryState.telemetryDirectory) {
    return;
  }

  try {
    fs.mkdirSync(telemetryState.telemetryDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(telemetryState.telemetryDirectory, `${record.startedAt}-${record.runId}.json`),
      `${JSON.stringify(record, null, 2)}\n`
    );
  } catch {
    // Telemetry is diagnostic-only; run execution must not fail if local persistence is unavailable.
  }
}
