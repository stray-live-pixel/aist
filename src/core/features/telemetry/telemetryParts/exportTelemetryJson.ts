import { AgentTelemetryDashboard } from './AgentTelemetryDashboard';

export function exportTelemetryJson(payload: Pick<AgentTelemetryDashboard, 'recentRuns' | 'aggregates'>): string {
  return `${JSON.stringify(
    {
      exportKind: 'aist.telemetry.v1',
      exportedAt: new Date().toISOString(),
      privacy: 'No raw prompts, tool arguments, tool outputs, or secrets are included.',
      aggregates: payload.aggregates,
      recentRuns: payload.recentRuns
    },
    null,
    2
  )}\n`;
}
