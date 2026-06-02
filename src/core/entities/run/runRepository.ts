import { randomUUID } from 'node:crypto';

import {
  FileRepositoryError,
  assertRepositoryId,
  listDirectoryNames,
  pathExists,
  readJsonFile,
  readJsonlFile,
  removeUndefined,
  sortByUpdatedAtDesc
} from '../../shared/lib/fileRepository';
import type { JsonValue, RuntimeEvent } from '../../shared/types/types';
import { appendJsonl, globalWorkspaceRunsDir, safeMkdir, writeJsonAtomic } from '../storage/storage';
import { RUN_SCHEMA_VERSION } from './runRepository/constants';
import { createRunEventMetaPatch } from './runRepository/createRunEventMetaPatch';
import { getRuntimeEventRunId } from './runRepository/getRuntimeEventRunId';
import { normalizeRunMeta } from './runRepository/normalizeRunMeta';
import { normalizeRunUsage } from './runRepository/normalizeRunUsage';
import {
  getRunApprovalsPath,
  getRunEventsPath,
  getRunMetaPath,
  getRunPath,
  getRunTelemetryPath,
  getRunToolResultsPath
} from './runRepository/paths';
import type {
  CreateRunInput,
  RunApprovalInput,
  RunApprovalLogEntry,
  RunMetadata,
  RunMetadataPatch,
  RunRecord,
  RunRepositoryOptions,
  RunToolResultInput,
  RunToolResultLogEntry
} from './runRepository/types';

export type {
  CreateRunInput,
  RunApprovalInput,
  RunApprovalLogEntry,
  RunMetadata,
  RunMetadataPatch,
  RunRecord,
  RunRepositoryOptions,
  RunToolResultInput,
  RunToolResultLogEntry
} from './runRepository/types';

/**
 * Что это: файловый источник правды для CLI/backend запусков агента.
 * Зачем нужно: runtime пишет события, approval и результаты tools в append-only логи, а meta хранит быстрый статус.
 * Какую проблему решает: запуск можно восстановить после перезапуска daemon без потери аудита и telemetry.
 */
export class RunRepository {
  readonly rootPath: string;
  private readonly idFactory: () => string;
  private readonly now: () => number;

  constructor(options: RunRepositoryOptions) {
    this.rootPath = globalWorkspaceRunsDir(options.workspaceRoot, options.homeDir);
    this.idFactory = options.idFactory || randomUUID;
    this.now = options.now || Date.now;
  }

  async create(input: CreateRunInput): Promise<RunMetadata> {
    const now = this.now();
    const runId = assertRepositoryId(input.id || this.idFactory(), 'run');
    const runPath = getRunPath({ rootPath: this.rootPath, runId });
    if (await pathExists(runPath)) {
      throw new FileRepositoryError('repository.conflict', `Run already exists: ${runId}`, { id: runId });
    }

    await safeMkdir(runPath);
    const meta = normalizeRunMeta({
      meta: {
        schemaVersion: RUN_SCHEMA_VERSION,
        id: runId,
        chatId: input.chatId,
        status: input.status || 'running',
        prompt: input.prompt,
        model: input.model,
        startedAt: input.startedAt || now,
        updatedAt: now
      }
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

    const events = await readJsonlFile<RuntimeEvent>(getRunEventsPath({ rootPath: this.rootPath, runId: safeRunId }));
    const approvals = await readJsonlFile<RunApprovalLogEntry>(
      getRunApprovalsPath({ rootPath: this.rootPath, runId: safeRunId })
    );
    const toolResults = await readJsonlFile<RunToolResultLogEntry>(
      getRunToolResultsPath({ rootPath: this.rootPath, runId: safeRunId })
    );
    const telemetry = await readJsonFile<JsonValue>(getRunTelemetryPath({ rootPath: this.rootPath, runId: safeRunId }));
    return { meta, events, approvals, toolResults, telemetry };
  }

  async update(runId: string, patch: RunMetadataPatch): Promise<RunMetadata> {
    const meta = await this.requireMeta(runId);
    const nextMeta = normalizeRunMeta({
      meta: {
        ...meta,
        ...patch,
        usage: patch.usage ? normalizeRunUsage({ usage: patch.usage }) : meta.usage,
        updatedAt: this.now()
      }
    });
    await this.writeMeta(nextMeta);
    return nextMeta;
  }

  async appendEvent(runId: string, event: RuntimeEvent): Promise<void> {
    const meta = await this.requireMeta(runId);
    const eventRunId = getRuntimeEventRunId({ event });
    if (eventRunId && eventRunId !== meta.id) {
      throw new FileRepositoryError('repository.invalidId', `Runtime event belongs to another run: ${eventRunId}`, {
        id: eventRunId
      });
    }

    await appendJsonl(getRunEventsPath({ rootPath: this.rootPath, runId: meta.id }), event);
    await this.writeMeta(
      normalizeRunMeta({ meta: { ...meta, ...createRunEventMetaPatch({ event }), updatedAt: this.now() } })
    );
  }

  async appendApproval(runId: string, approval: RunApprovalInput): Promise<RunApprovalLogEntry> {
    const meta = await this.requireMeta(runId);
    const entry: RunApprovalLogEntry = removeUndefined({
      ...approval,
      id: approval.id || this.idFactory(),
      runId: meta.id,
      createdAt: approval.createdAt || this.now()
    });
    await appendJsonl(getRunApprovalsPath({ rootPath: this.rootPath, runId: meta.id }), entry);
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
    await appendJsonl(getRunToolResultsPath({ rootPath: this.rootPath, runId: meta.id }), entry);
    await this.touch(meta);
    return entry;
  }

  async setTelemetry(runId: string, telemetry: JsonValue): Promise<void> {
    const meta = await this.requireMeta(runId);
    await writeJsonAtomic(getRunTelemetryPath({ rootPath: this.rootPath, runId: meta.id }), telemetry);
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
    const meta = await readJsonFile<RunMetadata>(getRunMetaPath({ rootPath: this.rootPath, runId: safeRunId }));
    return meta ? normalizeRunMeta({ meta }) : undefined;
  }

  private async touch(meta: RunMetadata): Promise<void> {
    await this.writeMeta({ ...meta, updatedAt: this.now() });
  }

  private writeMeta(meta: RunMetadata): Promise<void> {
    return writeJsonAtomic(getRunMetaPath({ rootPath: this.rootPath, runId: meta.id }), normalizeRunMeta({ meta }));
  }

  private async listRunIds(): Promise<string[]> {
    const directoryNames = await listDirectoryNames(this.rootPath);
    const runIds: string[] = [];
    for (const directoryName of directoryNames) {
      const runId = assertRepositoryId(directoryName, 'run');
      if (await pathExists(getRunMetaPath({ rootPath: this.rootPath, runId }))) {
        runIds.push(runId);
      }
    }

    return runIds.sort();
  }
}
