import { RunTelemetryApprovals } from './RunTelemetryApprovals';
import { RunTelemetryStatus } from './RunTelemetryStatus';

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
