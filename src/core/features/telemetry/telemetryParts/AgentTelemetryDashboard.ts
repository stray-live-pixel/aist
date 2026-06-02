import { AgentRunTelemetryRecord } from './AgentRunTelemetryRecord';
import { AgentTelemetryAggregates } from './AgentTelemetryAggregates';

export type AgentTelemetryDashboard = {
  storagePath?: string;
  recentRuns: AgentRunTelemetryRecord[];
  aggregates: AgentTelemetryAggregates;
  jsonExport: string;
  markdownExport: string;
};
