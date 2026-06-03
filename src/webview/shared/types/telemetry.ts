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

export type PerformanceTelemetryOperation =
  | 'chat.create'
  | 'agent.request'
  | 'webview.render'
  | 'webview.patch'
  | 'webview.state';

export type PerformanceTelemetryRecord = {
  schemaVersion: number;
  id: string;
  operation: PerformanceTelemetryOperation;
  extensionVersion: string;
  workspaceRoot?: string;
  chatId?: string;
  surfaceId?: string;
  surfaceKind?: 'sidebar' | 'editor';
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  status: 'success' | 'error' | 'stopped';
  renderCount?: number;
  messageCount?: number;
  reason?: string;
  meta?: Record<string, string | number | boolean>;
};

export type PerformanceTelemetryBucket = {
  key: string;
  label: string;
  operation?: PerformanceTelemetryOperation;
  extensionVersion?: string;
  chatId?: string;
  count: number;
  averageDurationMs: number;
  p95DurationMs: number;
  maxDurationMs: number;
  totalDurationMs: number;
  averageRenderCount?: number;
  totalRenderCount?: number;
};

export type PerformanceTelemetryDashboard = {
  storagePath?: string;
  recentRecords: PerformanceTelemetryRecord[];
  summary: PerformanceTelemetryBucket[];
  byChat: PerformanceTelemetryBucket[];
  byDay: PerformanceTelemetryBucket[];
  byWeek: PerformanceTelemetryBucket[];
  byMonth: PerformanceTelemetryBucket[];
  byVersion: PerformanceTelemetryBucket[];
  blockers: PerformanceTelemetryBucket[];
  jsonExport: string;
  markdownExport: string;
};
