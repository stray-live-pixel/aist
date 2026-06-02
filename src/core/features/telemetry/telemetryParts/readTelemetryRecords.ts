import fs from 'node:fs';
import path from 'node:path';

import { AgentRunTelemetryRecord } from './AgentRunTelemetryRecord';
import { MAX_TELEMETRY_RECORDS } from './MAX_TELEMETRY_RECORDS';
import { readTelemetryRecord } from './readTelemetryRecord';
import { sortRecords } from './sortRecords';

export function readTelemetryRecords(directory: string): AgentRunTelemetryRecord[] {
  try {
    if (!fs.existsSync(directory)) {
      return [];
    }

    return sortRecords(
      fs
        .readdirSync(directory)
        .filter((name) => name.endsWith('.json'))
        .map((name) => readTelemetryRecord(path.join(directory, name)))
        .filter((record): record is AgentRunTelemetryRecord => Boolean(record))
    ).slice(0, MAX_TELEMETRY_RECORDS);
  } catch {
    return [];
  }
}
