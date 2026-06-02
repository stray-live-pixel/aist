import { RunTelemetryApprovals } from './RunTelemetryApprovals';

export type AgentTelemetryAggregates = {
  runCount: number;
  successCount: number;
  errorCount: number;
  stoppedCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  toolCallCount: number;
  repeatedToolCalls: number;
  failedEdits: number;
  approvals: RunTelemetryApprovals;
  contextBytes: number;
  averageDurationMs: number;
  averageFirstEditLatencyMs?: number;
  toolCallsByType: Record<string, number>;
};
