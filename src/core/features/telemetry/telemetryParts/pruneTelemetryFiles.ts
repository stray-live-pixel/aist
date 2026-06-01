import fs from 'node:fs';
import path from 'node:path';

import { MAX_TELEMETRY_RECORDS } from './MAX_TELEMETRY_RECORDS';
import { telemetryState } from './telemetryState';

export function pruneTelemetryFiles(): void {
  if (!telemetryState.telemetryDirectory) {
    return;
  }

  try {
    const files = fs
      .readdirSync(telemetryState.telemetryDirectory)
      .filter((name) => name.endsWith('.json'))
      .map((name) => ({ name, filePath: path.join(telemetryState.telemetryDirectory!, name) }))
      .sort((left, right) => right.name.localeCompare(left.name));
    for (const file of files.slice(MAX_TELEMETRY_RECORDS)) {
      fs.rmSync(file.filePath, { force: true });
    }
  } catch {
    // Best-effort retention only.
  }
}
