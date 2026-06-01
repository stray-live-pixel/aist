import { AgentTelemetryDashboard } from './AgentTelemetryDashboard';

export function exportTelemetryMarkdown(payload: Pick<AgentTelemetryDashboard, 'recentRuns' | 'aggregates'>): string {
  const aggregate = payload.aggregates;
  const lines = [
    '# AIST Telemetry',
    '',
    'No raw prompts, tool arguments, tool outputs, or secrets are included.',
    '',
    '## Aggregates',
    '',
    `- Runs: ${aggregate.runCount} (${aggregate.successCount} success, ${aggregate.errorCount} error, ${aggregate.stoppedCount} stopped)`,
    `- Tokens: ${aggregate.totalTokens} total (${aggregate.promptTokens} prompt, ${aggregate.completionTokens} completion)`,
    `- Tool calls: ${aggregate.toolCallCount}`,
    `- Repeated tool calls: ${aggregate.repeatedToolCalls}`,
    `- Failed edits: ${aggregate.failedEdits}`,
    `- Approvals: ${aggregate.approvals.requested} requested, ${aggregate.approvals.approved} approved, ${aggregate.approvals.denied} denied`,
    `- Context bytes: ${aggregate.contextBytes}`,
    `- Average duration: ${aggregate.averageDurationMs} ms`,
    `- Average first edit latency: ${aggregate.averageFirstEditLatencyMs ?? 'n/a'} ms`,
    '',
    '## Tool Calls By Type',
    ''
  ];
  const toolEntries = Object.entries(aggregate.toolCallsByType);
  lines.push(...(toolEntries.length ? toolEntries.map(([name, count]) => `- ${name}: ${count}`) : ['- none']));
  lines.push('', '## Recent Runs', '');
  lines.push(
    ...(payload.recentRuns.length
      ? payload.recentRuns.map(
          (run) =>
            `- ${new Date(run.finishedAt).toISOString()} ${run.status}: ${run.totalTokens} tokens, ${run.toolCallCount} tools, ${run.contextBytes} context bytes`
        )
      : ['- none'])
  );
  return `${lines.join('\n')}\n`;
}
