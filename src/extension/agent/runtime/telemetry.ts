import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type { Chat, ChatUsageEstimate } from '../../chats/types';

const TELEMETRY_SCHEMA_VERSION = 1;
const MAX_TELEMETRY_RECORDS = 100;
const EDIT_TOOL_NAMES = new Set(['edit_file', 'write_file', 'replace_in_file', 'apply_patch', 'delete_path']);

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

export type AgentRunTelemetryDraft = Omit<
  AgentRunTelemetryRecord,
  'schemaVersion' | 'finishedAt' | 'durationMs' | 'status'
>;

let telemetryDirectory: string | undefined;
let recordsCache: AgentRunTelemetryRecord[] = [];

export function initializeTelemetryStore(options: { workspaceRoot?: string; fallbackRoot?: string } = {}): void {
  const root = options.workspaceRoot
    ? path.join(options.workspaceRoot, '.aist-agent', 'telemetry')
    : options.fallbackRoot
      ? path.join(options.fallbackRoot, 'telemetry')
      : undefined;
  telemetryDirectory = root;
  recordsCache = root ? readTelemetryRecords(root) : [];
}

export function createRunTelemetryDraft(chat: Chat, startedAt = Date.now()): AgentRunTelemetryDraft {
  return {
    runId: randomUUID(),
    chatId: chat.id,
    model: chat.model,
    startedAt,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    modelRequestCount: 0,
    toolCallCount: 0,
    toolCallsByType: {},
    repeatedToolCalls: 0,
    failedEdits: 0,
    approvals: { requested: 0, approved: 0, denied: 0 },
    contextBytes: 0
  };
}

export function recordModelRequest(draft: AgentRunTelemetryDraft | undefined): void {
  if (!draft) {
    return;
  }

  draft.modelRequestCount += 1;
}

export function recordModelUsage(
  draft: AgentRunTelemetryDraft | undefined,
  usage: ChatUsageEstimate | undefined
): void {
  if (!draft || !usage) {
    return;
  }

  draft.promptTokens += usage.promptTokens || 0;
  draft.completionTokens += usage.completionTokens || 0;
  draft.totalTokens += usage.totalTokens || 0;
}

export function recordContextBytes(draft: AgentRunTelemetryDraft | undefined, bytes: number): void {
  if (!draft || draft.contextBytes || !Number.isFinite(bytes)) {
    return;
  }

  draft.contextBytes = Math.max(0, Math.round(bytes));
}

export function recordToolCalls(draft: AgentRunTelemetryDraft | undefined, toolNames: string[]): void {
  if (!draft) {
    return;
  }

  for (const toolName of toolNames) {
    draft.toolCallCount += 1;
    draft.toolCallsByType[toolName] = (draft.toolCallsByType[toolName] || 0) + 1;
  }
}

export function recordRepeatedToolCall(draft: AgentRunTelemetryDraft | undefined): void {
  if (!draft) {
    return;
  }

  draft.repeatedToolCalls += 1;
}

export function recordToolStarted(draft: AgentRunTelemetryDraft | undefined, toolName: string, now = Date.now()): void {
  if (!draft || !isEditTool(toolName) || draft.firstEditLatencyMs !== undefined) {
    return;
  }

  draft.firstEditLatencyMs = Math.max(0, now - draft.startedAt);
}

export function recordFailedEdit(draft: AgentRunTelemetryDraft | undefined, toolName: string): void {
  if (!draft || !isEditTool(toolName)) {
    return;
  }

  draft.failedEdits += 1;
}

export function recordApprovalRequested(draft: AgentRunTelemetryDraft | undefined): void {
  if (!draft) {
    return;
  }

  draft.approvals.requested += 1;
}

export function recordApprovalDecision(draft: AgentRunTelemetryDraft | undefined, approved: boolean): void {
  if (!draft) {
    return;
  }

  if (approved) {
    draft.approvals.approved += 1;
  } else {
    draft.approvals.denied += 1;
  }
}

export function finalizeRunTelemetry(
  draft: AgentRunTelemetryDraft | undefined,
  status: RunTelemetryStatus,
  finishedAt = Date.now()
): AgentRunTelemetryRecord | undefined {
  if (!draft) {
    return undefined;
  }

  const record: AgentRunTelemetryRecord = {
    schemaVersion: TELEMETRY_SCHEMA_VERSION,
    ...draft,
    finishedAt,
    durationMs: Math.max(0, finishedAt - draft.startedAt),
    status,
    toolCallsByType: sortRecord(draft.toolCallsByType)
  };
  recordsCache = sortRecords([record, ...recordsCache.filter((item) => item.runId !== record.runId)]).slice(
    0,
    MAX_TELEMETRY_RECORDS
  );
  writeTelemetryRecord(record);
  pruneTelemetryFiles();
  return record;
}

export function getTelemetryDashboardState(): AgentTelemetryDashboard {
  const recentRuns = sortRecords(recordsCache).slice(0, 20);
  const aggregates = aggregateTelemetry(recordsCache);
  return {
    storagePath: telemetryDirectory,
    recentRuns,
    aggregates,
    jsonExport: exportTelemetryJson({ recentRuns, aggregates }),
    markdownExport: exportTelemetryMarkdown({ recentRuns, aggregates })
  };
}

export function aggregateTelemetry(records: AgentRunTelemetryRecord[]): AgentTelemetryAggregates {
  const base: AgentTelemetryAggregates = {
    runCount: records.length,
    successCount: 0,
    errorCount: 0,
    stoppedCount: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    toolCallCount: 0,
    repeatedToolCalls: 0,
    failedEdits: 0,
    approvals: { requested: 0, approved: 0, denied: 0 },
    contextBytes: 0,
    averageDurationMs: 0,
    toolCallsByType: {}
  };
  let durationTotal = 0;
  let firstEditLatencyTotal = 0;
  let firstEditLatencyCount = 0;

  for (const record of records) {
    if (record.status === 'success') base.successCount += 1;
    if (record.status === 'error') base.errorCount += 1;
    if (record.status === 'stopped') base.stoppedCount += 1;
    base.promptTokens += record.promptTokens;
    base.completionTokens += record.completionTokens;
    base.totalTokens += record.totalTokens;
    base.toolCallCount += record.toolCallCount;
    base.repeatedToolCalls += record.repeatedToolCalls;
    base.failedEdits += record.failedEdits;
    base.approvals.requested += record.approvals.requested;
    base.approvals.approved += record.approvals.approved;
    base.approvals.denied += record.approvals.denied;
    base.contextBytes += record.contextBytes;
    durationTotal += record.durationMs;
    if (record.firstEditLatencyMs !== undefined) {
      firstEditLatencyTotal += record.firstEditLatencyMs;
      firstEditLatencyCount += 1;
    }
    for (const [toolName, count] of Object.entries(record.toolCallsByType)) {
      base.toolCallsByType[toolName] = (base.toolCallsByType[toolName] || 0) + count;
    }
  }

  base.averageDurationMs = records.length ? Math.round(durationTotal / records.length) : 0;
  base.averageFirstEditLatencyMs = firstEditLatencyCount
    ? Math.round(firstEditLatencyTotal / firstEditLatencyCount)
    : undefined;
  base.toolCallsByType = sortRecord(base.toolCallsByType);
  return base;
}

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

function readTelemetryRecords(directory: string): AgentRunTelemetryRecord[] {
  try {
    if (!fs.existsSync(directory)) {
      return [];
    }

    return sortRecords(
      fs
        .readdirSync(directory)
        .filter((name) => name.endsWith('.json'))
        .map((name) => readTelemetryRecord(path.join(directory, name)))
        .filter((record): record is AgentRunTelemetryRecord => Boolean(record))
    ).slice(0, MAX_TELEMETRY_RECORDS);
  } catch {
    return [];
  }
}

function readTelemetryRecord(filePath: string): AgentRunTelemetryRecord | undefined {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<AgentRunTelemetryRecord>;
    if (parsed.schemaVersion !== TELEMETRY_SCHEMA_VERSION || !parsed.runId || !parsed.startedAt) {
      return undefined;
    }

    return normalizeRecord(parsed);
  } catch {
    return undefined;
  }
}

function normalizeRecord(record: Partial<AgentRunTelemetryRecord>): AgentRunTelemetryRecord {
  const startedAt = Number(record.startedAt) || Date.now();
  const finishedAt = Number(record.finishedAt) || startedAt;
  return {
    schemaVersion: TELEMETRY_SCHEMA_VERSION,
    runId: String(record.runId),
    chatId: String(record.chatId || ''),
    model: String(record.model || ''),
    startedAt,
    finishedAt,
    durationMs: Number(record.durationMs) || Math.max(0, finishedAt - startedAt),
    status: record.status === 'error' || record.status === 'stopped' ? record.status : 'success',
    promptTokens: Number(record.promptTokens) || 0,
    completionTokens: Number(record.completionTokens) || 0,
    totalTokens: Number(record.totalTokens) || 0,
    modelRequestCount: Number(record.modelRequestCount) || 0,
    toolCallCount: Number(record.toolCallCount) || 0,
    toolCallsByType: sortRecord(record.toolCallsByType || {}),
    repeatedToolCalls: Number(record.repeatedToolCalls) || 0,
    firstEditLatencyMs:
      record.firstEditLatencyMs === undefined ? undefined : Math.max(0, Number(record.firstEditLatencyMs) || 0),
    failedEdits: Number(record.failedEdits) || 0,
    approvals: {
      requested: Number(record.approvals?.requested) || 0,
      approved: Number(record.approvals?.approved) || 0,
      denied: Number(record.approvals?.denied) || 0
    },
    contextBytes: Number(record.contextBytes) || 0
  };
}

function writeTelemetryRecord(record: AgentRunTelemetryRecord): void {
  if (!telemetryDirectory) {
    return;
  }

  try {
    fs.mkdirSync(telemetryDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(telemetryDirectory, `${record.startedAt}-${record.runId}.json`),
      `${JSON.stringify(record, null, 2)}\n`
    );
  } catch {
    // Telemetry is diagnostic-only; run execution must not fail if local persistence is unavailable.
  }
}

function pruneTelemetryFiles(): void {
  if (!telemetryDirectory) {
    return;
  }

  try {
    const files = fs
      .readdirSync(telemetryDirectory)
      .filter((name) => name.endsWith('.json'))
      .map((name) => ({ name, filePath: path.join(telemetryDirectory!, name) }))
      .sort((left, right) => right.name.localeCompare(left.name));
    for (const file of files.slice(MAX_TELEMETRY_RECORDS)) {
      fs.rmSync(file.filePath, { force: true });
    }
  } catch {
    // Best-effort retention only.
  }
}

function isEditTool(toolName: string): boolean {
  return EDIT_TOOL_NAMES.has(toolName);
}

function sortRecords(records: AgentRunTelemetryRecord[]): AgentRunTelemetryRecord[] {
  return [...records].sort((left, right) => right.finishedAt - left.finishedAt);
}

function sortRecord(record: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(record).sort(([left], [right]) => left.localeCompare(right)));
}
