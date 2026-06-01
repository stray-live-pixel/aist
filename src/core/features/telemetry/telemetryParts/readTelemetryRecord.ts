import fs from 'node:fs';

import { AgentRunTelemetryRecord } from './AgentRunTelemetryRecord';
import { TELEMETRY_SCHEMA_VERSION } from './TELEMETRY_SCHEMA_VERSION';
import { normalizeRecord } from './normalizeRecord';

export function readTelemetryRecord(filePath: string): AgentRunTelemetryRecord | undefined {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<AgentRunTelemetryRecord>;
    if (parsed.schemaVersion !== TELEMETRY_SCHEMA_VERSION || !parsed.runId || !parsed.startedAt) {
      return undefined;
    }

    return normalizeRecord(parsed);
  } catch {
    return undefined;
  }
}
