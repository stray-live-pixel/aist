export type RunTelemetryStatus = 'success' | 'error' | 'stopped';

export type RunTelemetryApprovals = {
  requested: number;
  approved: number;
  denied: number;
};

export type AgentRunTelemetryRecord = {
  schemaVersion: number;
  runId: string;
  chatId: string;
  model: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  status: RunTelemetryStatus;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  modelRequestCount: number;
  toolCallCount: number;
  toolCallsByType: Record<string, number>;
  repeatedToolCalls: number;
  firstEditLatencyMs?: number;
  failedEdits: number;
  approvals: RunTelemetryApprovals;
  contextBytes: number;
};

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

export type AgentTelemetryDashboard = {
  storagePath?: string;
  recentRuns: AgentRunTelemetryRecord[];
  aggregates: AgentTelemetryAggregates;
  jsonExport: string;
  markdownExport: string;
};
