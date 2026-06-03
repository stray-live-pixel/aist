import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  FileRepositoryError,
  assertRepositoryId,
  childPath,
  listDirectoryNames,
  pathExists,
  readJsonFile,
  removeUndefined,
  sortByUpdatedAtDesc
} from '../../shared/lib/fileRepository';
import type { ChatMessage, JsonValue, OpenRouterMessage, SubagentKind, SubagentRun } from '../../shared/types/types';
import { globalWorkspaceSubagentsDir, safeMkdir, writeJsonAtomic } from '../storage/storage';

const SUBAGENT_RUN_SCHEMA_VERSION = 1;

export type SubagentRepositoryOptions = {
  workspaceRoot: string;
  homeDir?: string;
  idFactory?: () => string;
  now?: () => number;
};

export type CreateSubagentRunInput = {
  id?: string;
  parentChatId: string;
  kind: SubagentKind;
  mode: SubagentRun['mode'];
  title: string;
  status?: SubagentRun['status'];
  model: string;
  messages?: ChatMessage[];
  history?: OpenRouterMessage[];
  result?: JsonValue;
  error?: string;
  includeResultInParentModelContext: boolean;
  startedAt?: number;
  finishedAt?: number;
};

export type SubagentRunPatch = Partial<
  Pick<SubagentRun, 'status' | 'model' | 'messages' | 'history' | 'result' | 'error' | 'finishedAt'>
>;

type StoredSubagentRun = SubagentRun & {
  schemaVersion: number;
};

/**
 * Что это: файловое хранилище запусков субагентов.
 * Зачем нужно: каждый дочерний анализ живёт отдельно от parent chat history и остаётся доступен после перезагрузки UI.
 */
export class SubagentRepository {
  readonly rootPath: string;
  private readonly idFactory: () => string;
  private readonly now: () => number;

  constructor(options: SubagentRepositoryOptions) {
    this.rootPath = globalWorkspaceSubagentsDir(options.workspaceRoot, options.homeDir);
    this.idFactory = options.idFactory || randomUUID;
    this.now = options.now || Date.now;
  }

  /**
   * Что это: создаёт persisted запуск субагента.
   * Зачем нужно: loader в parent chat появляется сразу и уже знает id подробной истории.
   */
  async create(input: CreateSubagentRunInput): Promise<SubagentRun> {
    const now = this.now();
    const run = normalizeRun({
      schemaVersion: SUBAGENT_RUN_SCHEMA_VERSION,
      id: assertRepositoryId(input.id || this.idFactory(), 'subagent run'),
      parentChatId: assertRepositoryId(input.parentChatId, 'parent chat'),
      kind: input.kind,
      mode: input.mode,
      title: input.title,
      status: input.status || 'created',
      model: input.model,
      messages: input.messages || [],
      history: input.history || [],
      result: input.result,
      error: input.error,
      includeResultInParentModelContext: input.includeResultInParentModelContext,
      startedAt: input.startedAt || now,
      finishedAt: input.finishedAt,
      updatedAt: now
    });

    if (await pathExists(this.runPath(run.parentChatId, run.id))) {
      throw new FileRepositoryError('repository.conflict', `Subagent run already exists: ${run.id}`, { id: run.id });
    }

    await this.writeRun(run);
    return this.toRun(run);
  }

  /**
   * Что это: возвращает запуск по id среди всех parent chats.
   * Зачем нужно: кнопка «Детали» знает только runId и не должна искать parent chat на стороне UI.
   */
  async get(runId: string): Promise<SubagentRun | undefined> {
    const safeRunId = assertRepositoryId(runId, 'subagent run');
    for (const parentChatId of await this.listParentChatIds()) {
      const run = await readJsonFile<StoredSubagentRun>(this.runPath(parentChatId, safeRunId));
      if (run) {
        return this.toRun(normalizeRun(run));
      }
    }

    return undefined;
  }

  /**
   * Что это: возвращает запуски одного parent chat.
   * Зачем нужно: webview state активного чата получает только релевантные дочерние истории.
   */
  async list(parentChatId: string): Promise<SubagentRun[]> {
    const safeParentChatId = assertRepositoryId(parentChatId, 'parent chat');
    const runIds = await this.listRunIds(safeParentChatId);
    const runs: SubagentRun[] = [];
    for (const runId of runIds) {
      const run = await readJsonFile<StoredSubagentRun>(this.runPath(safeParentChatId, runId));
      if (run) {
        runs.push(this.toRun(normalizeRun(run)));
      }
    }

    return sortByUpdatedAtDesc(runs);
  }

  /**
   * Что это: обновляет persisted запуск субагента.
   * Зачем нужно: backend фиксирует финальный ответ, ошибку и parsed result в одной сущности.
   */
  async update(runId: string, patch: SubagentRunPatch): Promise<SubagentRun> {
    const current = await this.requireRun(runId);
    const next = normalizeRun({
      ...current,
      ...patch,
      schemaVersion: SUBAGENT_RUN_SCHEMA_VERSION,
      updatedAt: this.now()
    });
    await this.writeRun(next);
    return this.toRun(next);
  }

  private async requireRun(runId: string): Promise<StoredSubagentRun> {
    const run = await this.get(runId);
    if (!run) {
      throw new FileRepositoryError('repository.readFailed', `Subagent run not found: ${runId}`, { id: runId });
    }

    return { ...run, schemaVersion: SUBAGENT_RUN_SCHEMA_VERSION };
  }

  private async listParentChatIds(): Promise<string[]> {
    const directoryNames = await listDirectoryNames(this.rootPath);
    return directoryNames.map((directoryName) => assertRepositoryId(directoryName, 'parent chat')).sort();
  }

  private async listRunIds(parentChatId: string): Promise<string[]> {
    const directoryPath = this.parentPath(parentChatId);
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(directoryPath, { withFileTypes: true });
    } catch (cause) {
      if (cause && typeof cause === 'object' && 'code' in cause && cause.code === 'ENOENT') {
        return [];
      }
      throw new FileRepositoryError('repository.readFailed', `Failed to list subagent runs: ${directoryPath}`, {
        filePath: directoryPath,
        cause
      });
    }

    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => assertRepositoryId(entry.name.slice(0, -'.json'.length), 'subagent run'))
      .sort();
  }

  private async writeRun(run: StoredSubagentRun): Promise<void> {
    await safeMkdir(this.parentPath(run.parentChatId));
    await writeJsonAtomic(this.runPath(run.parentChatId, run.id), run);
  }

  private toRun(run: StoredSubagentRun): SubagentRun {
    const { schemaVersion: _schemaVersion, ...publicRun } = run;
    return publicRun;
  }

  private parentPath(parentChatId: string): string {
    return childPath(this.rootPath, assertRepositoryId(parentChatId, 'parent chat'));
  }

  private runPath(parentChatId: string, runId: string): string {
    return path.join(this.parentPath(parentChatId), `${assertRepositoryId(runId, 'subagent run')}.json`);
  }
}

function normalizeRun(run: StoredSubagentRun): StoredSubagentRun {
  const now = Date.now();
  return removeUndefined({
    schemaVersion: SUBAGENT_RUN_SCHEMA_VERSION,
    id: assertRepositoryId(run.id, 'subagent run'),
    parentChatId: assertRepositoryId(run.parentChatId, 'parent chat'),
    kind: run.kind === 'memory.analysis' || run.kind === 'agent.task' ? run.kind : 'memory.analysis',
    mode: run.mode === 'agent_loop' ? 'agent_loop' : 'single_model_call',
    title: typeof run.title === 'string' && run.title.trim() ? run.title : 'Субагент',
    status: normalizeStatus(run.status),
    model: typeof run.model === 'string' && run.model.trim() ? run.model : 'unknown',
    messages: Array.isArray(run.messages) ? run.messages : [],
    history: Array.isArray(run.history) ? run.history : [],
    result: run.result,
    error: typeof run.error === 'string' ? run.error : undefined,
    includeResultInParentModelContext: run.includeResultInParentModelContext === true,
    startedAt: normalizeTimestamp(run.startedAt, now),
    finishedAt: typeof run.finishedAt === 'number' ? run.finishedAt : undefined,
    updatedAt: normalizeTimestamp(run.updatedAt, now)
  });
}

function normalizeStatus(status: unknown): SubagentRun['status'] {
  if (
    status === 'created' ||
    status === 'running' ||
    status === 'success' ||
    status === 'error' ||
    status === 'stopped'
  ) {
    return status;
  }

  return 'created';
}

function normalizeTimestamp(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
