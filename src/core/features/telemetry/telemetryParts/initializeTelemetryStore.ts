import path from 'node:path';

import { globalWorkspaceTelemetryDir } from '../../../entities/storage/storage';
import { readTelemetryRecords } from './readTelemetryRecords';
import { telemetryState } from './telemetryState';

export function initializeTelemetryStore(
  options: { workspaceRoot?: string; homeDir?: string; fallbackRoot?: string } = {}
): void {
  const root = options.workspaceRoot
    ? globalWorkspaceTelemetryDir(options.workspaceRoot, options.homeDir)
    : options.fallbackRoot
      ? path.join(options.fallbackRoot, 'telemetry')
      : undefined;
  telemetryState.telemetryDirectory = root;
  telemetryState.recordsCache = root ? readTelemetryRecords(root) : [];
}
