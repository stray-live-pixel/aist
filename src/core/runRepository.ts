import { randomUUID } from 'node:crypto';
import path from 'node:path';

import {
  FileRepositoryError,
  assertRepositoryId,
  childPath,
  listDirectoryNames,
  pathExists,
  readJsonFile,
  readJsonlFile,
  removeUndefined,
  sortByUpdatedAtDesc
} from './fileRepository';
import { appendJsonl, safeMkdir, workspaceRunsDir, writeJsonAtomic } from './storage';
import type {
  AgentRunStatus,
  ChatUsageEstimate,
  JsonValue,
  RuntimeEvent,
  RuntimeToolCallSnapshot,
  RuntimeToolResult,
  ToolApprovalDecision,
  ToolApprovalRequest
} from './types';

const RUN_SCHEMA_VERSION = 1;

export type RunRepositoryOptions = {
  workspaceRoot: string;
  idFactory?: () => string;
  now?: () => number;
};

export type CreateRunInput = {
  id?: string;
  chatId: string;
  prompt?: string;
  model?: string;
  status?: AgentRunStatus;
  startedAt?: number;
};

export type RunMetadataPatch = Partial<
  Pick<RunMetadata, 'chatId' | 'status' | 'prompt' | 'model' | 'startedAt' | 'finishedAt' | 'usage' | 'error'>
>;

export type RunMetadata = {
  schemaVersion: number;
  id: string;
  chatId: string;
  status: AgentRunStatus;
  prompt?: string;
  model?: string;
  startedAt: number;
  finishedAt?: number;
  updatedAt: number;
  usage?: ChatUsageEstimate;
  error?: { message: string; code?: string };
};

export type RunApprovalLogEntry = {
  id: string;
  runId: string;
  chatId?: string;
  approvalId?: string;
  messageId?: string;
  status?: 'requested' | ToolApprovalRequest['status'];
  approval?: ToolApprovalRequest;
  toolCall?: RuntimeToolCallSnapshot;
  decision?: ToolApprovalDecision;
  createdAt: number;
  resolvedAt?: number;
};

export type RunApprovalInput = Omit<RunApprovalLogEntry, 'id' | 'runId' | 'createdAt'> &
  Partial<Pick<RunApprovalLogEntry, 'id' | 'createdAt'>>;

export type RunToolResultLogEntry = {
  id: string;
  runId: string;
  chatId?: string;
  messageId?: string;
  toolCall?: RuntimeToolCallSnapshot;
  result: RuntimeToolResult;
  modelResult?: RuntimeToolResult;
  createdAt: number;
};

export type RunToolResultInput = Omit<RunToolResultLogEntry, 'id' | 'runId' | 'createdAt'> &
  Partial<Pick<RunToolResultLogEntry, 'id' | 'createdAt'>>;

export type RunRecord = {
  meta: RunMetadata;
  events: RuntimeEvent[];
  approvals: RunApprovalLogEntry[];
  toolResults: RunToolResultLogEntry[];
  telemetry?: JsonValue;
};

/**
 * File-backed source of truth for CLI/backend runs.
 *
 * Инварианты:
 * - `meta.json` и `telemetry.json` пишутся atomic temp+rename, потому что это
 *   последние снимки состояния run и агрегатов.
 * - `events.jsonl`, `approvals.jsonl` и `tool-results.jsonl` append-only:
 *   клиенты могут replay-ить запуск без риска потерять порядок runtime событий.
 * - Полные tool outputs лежат в `tool-results.jsonl`; model-visible compact
 *   results остаются рядом как `modelResult`, чтобы не раздувать history.
 * - Secrets не являются частью run record и не принимаются отдельными методами.
 */
export class RunRepository {
  readonly rootPath: string;
  private readonly idFactory: () => string;
  private readonly now: () => number;

  constructor(options: RunRepositoryOptions) {
    this.rootPath = workspaceRunsDir(options.workspaceRoot);
    this.idFactory = options.idFactory || randomUUID;
    this.now = options.now || Date.now;
  }

  async create(input: CreateRunInput): Promise<RunMetadata> {
    const now = this.now();
    const runId = assertRepositoryId(input.id || this.idFactory(), 'run');
    const runPath = this.runPath(runId);
    if (await pathExists(runPath)) {
      throw new FileRepositoryError('repository.conflict', `Run already exists: ${runId}`, { id: runId });
    }

    await safeMkdir(runPath);
    const meta = normalizeRunMeta({
      schemaVersion: RUN_SCHEMA_VERSION,
      id: runId,
      chatId: input.chatId,
      status: input.status || 'running',
      prompt: input.prompt,
      model: input.model,
      startedAt: input.startedAt || now,
      updatedAt: now
    });
    await this.writeMeta(meta);
    return meta;
  }

  async list(): Promise<RunMetadata[]> {
    const runIds = await this.listRunIds();
    const runs: RunMetadata[] = [];
    for (const runId of runIds) {
      const meta = await this.getMeta(runId);
      if (meta) {
        runs.push(meta);
      }
    }

    return sortByUpdatedAtDesc(runs);
  }

  async get(runId: string): Promise<RunRecord | undefined> {
    const safeRunId = assertRepositoryId(runId, 'run');
    const meta = await this.getMeta(safeRunId);
    if (!meta) {
      return undefined;
    }

    const events = await readJsonlFile<RuntimeEvent>(this.eventsPath(safeRunId));
    const approvals = await readJsonlFile<RunApprovalLogEntry>(this.approvalsPath(safeRunId));
    const toolResults = await readJsonlFile<RunToolResultLogEntry>(this.toolResultsPath(safeRunId));
    const telemetry = await readJsonFile<JsonValue>(this.telemetryPath(safeRunId));
    return { meta, events, approvals, toolResults, telemetry };
  }

  async update(runId: string, patch: RunMetadataPatch): Promise<RunMetadata> {
    const meta = await this.requireMeta(runId);
    const nextMeta = normalizeRunMeta({
      ...meta,
      ...patch,
      usage: patch.usage ? normalizeUsage(patch.usage) : meta.usage,
      updatedAt: this.now()
    });
    await this.writeMeta(nextMeta);
    return nextMeta;
  }

  async appendEvent(runId: string, event: RuntimeEvent): Promise<void> {
    const meta = await this.requireMeta(runId);
    const eventRunId = getRuntimeEventRunId(event);
    if (eventRunId && eventRunId !== meta.id) {
      throw new FileRepositoryError('repository.invalidId', `Runtime event belongs to another run: ${eventRunId}`, {
        id: eventRunId
      });
    }

    await appendJsonl(this.eventsPath(meta.id), event);
    await this.writeMeta(normalizeRunMeta({ ...meta, ...eventMetaPatch(event), updatedAt: this.now() }));
  }

  async appendApproval(runId: string, approval: RunApprovalInput): Promise<RunApprovalLogEntry> {
    const meta = await this.requireMeta(runId);
    const entry: RunApprovalLogEntry = removeUndefined({
      ...approval,
      id: approval.id || this.idFactory(),
      runId: meta.id,
      createdAt: approval.createdAt || this.now()
    });
    await appendJsonl(this.approvalsPath(meta.id), entry);
    await this.touch(meta);
    return entry;
  }

  async appendToolResult(runId: string, result: RunToolResultInput): Promise<RunToolResultLogEntry> {
    const meta = await this.requireMeta(runId);
    const entry: RunToolResultLogEntry = removeUndefined({
      ...result,
      id: result.id || this.idFactory(),
      runId: meta.id,
      createdAt: result.createdAt || this.now()
    });
    await appendJsonl(this.toolResultsPath(meta.id), entry);
    await this.touch(meta);
    return entry;
  }

  async setTelemetry(runId: string, telemetry: JsonValue): Promise<void> {
    const meta = await this.requireMeta(runId);
    await writeJsonAtomic(this.telemetryPath(meta.id), telemetry);
    await this.touch(meta);
  }

  private async requireMeta(runId: string): Promise<RunMetadata> {
    const safeRunId = assertRepositoryId(runId, 'run');
    const meta = await this.getMeta(safeRunId);
    if (!meta) {
      throw new FileRepositoryError('repository.readFailed', `Run not found: ${safeRunId}`, { id: safeRunId });
    }

    return meta;
  }

  private async getMeta(runId: string): Promise<RunMetadata | undefined> {
    const safeRunId = assertRepositoryId(runId, 'run');
    const meta = await readJsonFile<RunMetadata>(this.metaPath(safeRunId));
    return meta ? normalizeRunMeta(meta) : undefined;
  }

  private async touch(meta: RunMetadata): Promise<void> {
    await this.writeMeta({ ...meta, updatedAt: this.now() });
  }

  private writeMeta(meta: RunMetadata): Promise<void> {
    return writeJsonAtomic(this.metaPath(meta.id), normalizeRunMeta(meta));
  }

  private async listRunIds(): Promise<string[]> {
    const directoryNames = await listDirectoryNames(this.rootPath);
    const runIds: string[] = [];
    for (const directoryName of directoryNames) {
      const runId = assertRepositoryId(directoryName, 'run');
      if (await pathExists(this.metaPath(runId))) {
        runIds.push(runId);
      }
    }

    return runIds.sort();
  }

  private runPath(runId: string): string {
    return childPath(this.rootPath, assertRepositoryId(runId, 'run'));
  }

  private metaPath(runId: string): string {
    return path.join(this.runPath(runId), 'meta.json');
  }

  private eventsPath(runId: string): string {
    return path.join(this.runPath(runId), 'events.jsonl');
  }

  private approvalsPath(runId: string): string {
    return path.join(this.runPath(runId), 'approvals.jsonl');
  }

  private toolResultsPath(runId: string): string {
    return path.join(this.runPath(runId), 'tool-results.jsonl');
  }

  private telemetryPath(runId: string): string {
    return path.join(this.runPath(runId), 'telemetry.json');
  }
}

function normalizeRunMeta(meta: RunMetadata): RunMetadata {
  return removeUndefined({
    schemaVersion: RUN_SCHEMA_VERSION,
    id: assertRepositoryId(meta.id, 'run'),
    chatId: assertRepositoryId(meta.chatId, 'chat'),
    status: normalizeRunStatus(meta.status),
    prompt: meta.prompt,
    model: meta.model,
    startedAt: normalizeTimestamp(meta.startedAt),
    finishedAt: meta.finishedAt,
    updatedAt: normalizeTimestamp(meta.updatedAt || meta.startedAt),
    usage: meta.usage ? normalizeUsage(meta.usage) : undefined,
    error: meta.error
  });
}

function eventMetaPatch(event: RuntimeEvent): Partial<RunMetadata> {
  switch (event.type) {
    case 'run.started':
      return {
        status: event.run.status,
        chatId: event.run.chatId,
        prompt: event.run.prompt,
        model: event.run.model,
        startedAt: event.run.startedAt,
        finishedAt: event.run.finishedAt,
        usage: event.run.usage
      };
    case 'run.activity':
      if (event.activity === 'waitingForApproval') {
        return { status: 'waitingForApproval' };
      }
      if (event.activity === 'stopping') {
        return { status: 'stopping' };
      }
      return {};
    case 'run.completed':
      return {
        status: 'completed',
        chatId: event.run.chatId,
        model: event.run.model,
        finishedAt: event.run.finishedAt || event.at,
        usage: event.usage
      };
    case 'run.failed':
      return {
        status: 'failed',
        chatId: event.chatId,
        finishedAt: event.at,
        error: { message: event.error.message, code: event.error.code }
      };
    case 'run.stopped':
      return { status: 'stopped', chatId: event.chatId, finishedAt: event.at };
    case 'run.finished':
      return {
        status: event.status,
        chatId: event.run.chatId,
        model: event.run.model,
        finishedAt: event.run.finishedAt || event.at,
        usage: event.usage
      };
    case 'run.error':
      return {
        status: 'failed',
        chatId: event.chatId,
        finishedAt: event.at,
        error: { message: event.error.message, code: event.error.code }
      };
    default:
      return {};
  }
}

function getRuntimeEventRunId(event: RuntimeEvent): string | undefined {
  switch (event.type) {
    case 'run.started':
    case 'run.completed':
    case 'run.finished':
      return event.run.id;
    case 'message.appended':
    case 'chat.updated':
      return undefined;
    default:
      return event.runId;
  }
}

function normalizeRunStatus(status: unknown): AgentRunStatus {
  return ['running', 'waitingForApproval', 'stopping', 'completed', 'failed', 'stopped'].includes(String(status))
    ? (status as AgentRunStatus)
    : 'running';
}

function normalizeUsage(usage: Partial<ChatUsageEstimate>): ChatUsageEstimate {
  return removeUndefined({
    promptTokens: usage.promptTokens || 0,
    completionTokens: usage.completionTokens || 0,
    totalTokens: usage.totalTokens || 0,
    costUsd: usage.costUsd
  });
}

function normalizeTimestamp(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Date.now();
}
