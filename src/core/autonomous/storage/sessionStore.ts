import fs from 'node:fs/promises';
import path from 'node:path';

import { AutonomousStorageError } from '../errors';
import type {
  AutonomousBatchState,
  AutonomousCommandState,
  AutonomousEvent,
  AutonomousFlowState,
  AutonomousSessionMeta,
  AutonomousSessionView
} from '../types';

export const AUTONOMOUS_SESSIONS_RELATIVE_PATH = path.join('.aist-agent', 'autonomous', 'sessions');

export type AutonomousSessionStoreOptions = {
  onEvent?(sessionId: string, event: AutonomousEvent): void;
};

/**
 * Что это: файловое хранилище autonomous sessions.
 * Почему здесь сосредоточен fs: controller/orchestrator должны работать с
 * доменными операциями `createSession/writeFlow/appendEvent`, а не знать имена
 * файлов и правила atomic write. Это понадобится и для будущего desktop app.
 */
export class AutonomousSessionStore {
  constructor(
    private readonly workspaceRoot: string,
    private readonly options: AutonomousSessionStoreOptions = {}
  ) {
    if (!workspaceRoot) {
      throw new AutonomousStorageError('Open a workspace before creating autonomous sessions.', 'workspace.missing');
    }
  }

  get rootPath(): string {
    return path.join(this.workspaceRoot, AUTONOMOUS_SESSIONS_RELATIVE_PATH);
  }

  async createSession(meta: AutonomousSessionMeta, command: AutonomousCommandState): Promise<void> {
    const sessionPath = this.getSessionPath(meta.id);
    await fs.mkdir(path.join(sessionPath, 'raw'), { recursive: true });
    await fs.mkdir(path.join(sessionPath, 'artifacts'), { recursive: true });
    await this.writeJson(meta.id, 'meta.json', meta);
    await this.writeJson(meta.id, 'command.json', command);
  }

  async updateMeta(meta: AutonomousSessionMeta): Promise<void> {
    await this.writeJson(meta.id, 'meta.json', meta);
  }

  async writeFlow(sessionId: string, flow: AutonomousFlowState): Promise<void> {
    await this.writeJson(sessionId, 'flow.json', flow);
  }

  async writeBatch(sessionId: string, batch: AutonomousBatchState): Promise<void> {
    await this.writeJson(sessionId, 'batch.json', batch);
  }

  async appendEvent(sessionId: string, event: AutonomousEvent): Promise<void> {
    const sessionPath = this.getSessionPath(sessionId);
    await fs.mkdir(sessionPath, { recursive: true });
    await fs.appendFile(path.join(sessionPath, 'events.jsonl'), `${JSON.stringify(event)}\n`, 'utf8');
    this.options.onEvent?.(sessionId, event);
  }

  async listSessions(limit = 20, tailEvents = 300): Promise<AutonomousSessionView[]> {
    await fs.mkdir(this.rootPath, { recursive: true });
    const entries = await fs.readdir(this.rootPath, { withFileTypes: true });
    const views = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => this.readSession(entry.name, tailEvents).catch(() => undefined))
    );

    return views
      .filter((view): view is AutonomousSessionView => !!view)
      .sort((left, right) => right.meta.startedAt.localeCompare(left.meta.startedAt))
      .slice(0, limit);
  }

  async readSession(sessionId: string, tailEvents = 300): Promise<AutonomousSessionView> {
    const [meta, command, flow, batch, events] = await Promise.all([
      this.readJson<AutonomousSessionMeta>(sessionId, 'meta.json'),
      this.readOptionalJson<AutonomousCommandState>(sessionId, 'command.json'),
      this.readOptionalJson<AutonomousFlowState>(sessionId, 'flow.json'),
      this.readOptionalJson<AutonomousBatchState>(sessionId, 'batch.json'),
      this.readEvents(sessionId, tailEvents)
    ]);

    return { meta, command, flow, batch, events };
  }

  async exportMarkdown(sessionId: string): Promise<string> {
    const session = await this.readSession(sessionId, Number.MAX_SAFE_INTEGER);
    const lines = [
      `# Autonomous session ${session.meta.id}`,
      '',
      `- kind: ${session.meta.kind}`,
      `- status: ${session.meta.status}`,
      `- engine: ${session.meta.engineId}`,
      `- startedAt: ${session.meta.startedAt}`,
      session.meta.finishedAt ? `- finishedAt: ${session.meta.finishedAt}` : undefined,
      session.meta.error ? `- error: ${session.meta.error}` : undefined,
      '',
      '## Events',
      '',
      ...session.events.map((event) => `- ${event.ts} [${event.level}] ${event.action}: ${event.message}`)
    ].filter((line): line is string => line !== undefined);

    return lines.join('\n');
  }

  private async writeJson(sessionId: string, fileName: string, value: unknown): Promise<void> {
    const sessionPath = this.getSessionPath(sessionId);
    await fs.mkdir(sessionPath, { recursive: true });
    const targetPath = path.join(sessionPath, fileName);
    const tempPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(tempPath, targetPath);
  }

  private async readJson<T>(sessionId: string, fileName: string): Promise<T> {
    return JSON.parse(await fs.readFile(path.join(this.getSessionPath(sessionId), fileName), 'utf8')) as T;
  }

  private async readOptionalJson<T>(sessionId: string, fileName: string): Promise<T | undefined> {
    try {
      return await this.readJson<T>(sessionId, fileName);
    } catch {
      return undefined;
    }
  }

  private async readEvents(sessionId: string, tailEvents: number): Promise<AutonomousEvent[]> {
    try {
      const content = await fs.readFile(path.join(this.getSessionPath(sessionId), 'events.jsonl'), 'utf8');
      const parsed = content
        .split('\n')
        .filter(Boolean)
        .map((line) => safeParseEvent(line))
        .filter((event): event is AutonomousEvent => !!event);
      return parsed.slice(-tailEvents);
    } catch {
      return [];
    }
  }

  private getSessionPath(sessionId: string): string {
    return path.join(this.rootPath, sessionId);
  }
}

export function createAutonomousEvent(
  action: AutonomousEvent['action'],
  message: string,
  partial: Partial<Omit<AutonomousEvent, 'id' | 'ts' | 'action' | 'message'>> = {}
): AutonomousEvent {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date().toISOString(),
    level: partial.level || 'info',
    action,
    message,
    stageIndex: partial.stageIndex,
    taskIndex: partial.taskIndex,
    data: partial.data
  };
}

function safeParseEvent(line: string): AutonomousEvent | undefined {
  try {
    return JSON.parse(line) as AutonomousEvent;
  } catch {
    return undefined;
  }
}
