import { AgentTelemetryDashboard } from './AgentTelemetryDashboard';
import { aggregateTelemetry } from './aggregateTelemetry';
import { exportTelemetryJson } from './exportTelemetryJson';
import { exportTelemetryMarkdown } from './exportTelemetryMarkdown';
import { sortRecords } from './sortRecords';
import { telemetryState } from './telemetryState';

export function getTelemetryDashboardState(): AgentTelemetryDashboard {
  const recentRuns = sortRecords(telemetryState.recordsCache).slice(0, 20);
  const aggregates = aggregateTelemetry(telemetryState.recordsCache);
  return {
    storagePath: telemetryState.telemetryDirectory,
    recentRuns,
    aggregates,
    jsonExport: exportTelemetryJson({ recentRuns, aggregates }),
    markdownExport: exportTelemetryMarkdown({ recentRuns, aggregates })
  };
}
