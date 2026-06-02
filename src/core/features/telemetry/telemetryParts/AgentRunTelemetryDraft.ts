import { AgentRunTelemetryRecord } from './AgentRunTelemetryRecord';

export type AgentRunTelemetryDraft = Omit<
  AgentRunTelemetryRecord,
  'schemaVersion' | 'finishedAt' | 'durationMs' | 'status'
>;
