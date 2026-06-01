import { AgentRunTelemetryRecord } from './AgentRunTelemetryRecord';

export function sortRecords(records: AgentRunTelemetryRecord[]): AgentRunTelemetryRecord[] {
  return [...records].sort((left, right) => right.finishedAt - left.finishedAt);
}
