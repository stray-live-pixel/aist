import fs from 'node:fs';
import path from 'node:path';

import { globalAistRoot, safeMkdir, writeJsonAtomic } from '../../../../core/entities/storage/storage';
import type {
  IsolationRemoteServerGithubAuthMode,
  IsolationRemoteServerInput,
  IsolationRemoteServerSettings
} from '../../../daemonProtocol';

/**
 * Что это: глобальное хранилище SSH-серверов для isolated agents.
 * Зачем нужно: адреса серверов и пути к ключам являются личными настройками пользователя и не должны попадать в репозиторий.
 * Какую продуктовую проблему решает: один и тот же сервер доступен из разных workspace без риска закоммитить секретные параметры.
 */
export class IsolationRemoteServerStore {
  private readonly filePath: string;

  constructor(
    private readonly options: {
      readonly homeDir: string;
      readonly now: () => number;
      readonly idFactory: () => string;
    }
  ) {
    this.filePath = path.join(globalAistRoot(options.homeDir), 'isolation-remote-servers.json');
  }

  async list(): Promise<readonly IsolationRemoteServerSettings[]> {
    return this.read();
  }

  async upsert(input: IsolationRemoteServerInput): Promise<IsolationRemoteServerSettings> {
    const current = await this.read();
    const now = this.options.now();
    const existing = input.id ? current.find((server) => server.id === input.id) : undefined;
    const server: IsolationRemoteServerSettings = {
      id: existing?.id || input.id?.trim() || this.options.idFactory(),
      name: input.name.trim(),
      host: input.host.trim(),
      port: normalizePort({ port: input.port }),
      username: input.username.trim(),
      authMethod: input.authMethod,
      privateKeyPath: input.authMethod === 'ssh-key' ? input.privateKeyPath?.trim() || undefined : undefined,
      githubAuthMode: normalizeGithubAuthMode({ mode: input.githubAuthMode }),
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    validateServer({ server });
    await this.write([server, ...current.filter((item) => item.id !== server.id)]);
    return server;
  }

  async delete(serverId: string): Promise<boolean> {
    const current = await this.read();
    const next = current.filter((server) => server.id !== serverId);
    if (next.length === current.length) {
      return false;
    }
    await this.write(next);
    return true;
  }

  private async read(): Promise<IsolationRemoteServerSettings[]> {
    if (!fs.existsSync(this.filePath)) {
      return [];
    }

    try {
      const parsed = JSON.parse(await fs.promises.readFile(this.filePath, 'utf8')) as { servers?: unknown[] };
      return (parsed.servers || []).flatMap((value) => normalizeStoredServer({ value }));
    } catch {
      return [];
    }
  }

  private async write(servers: readonly IsolationRemoteServerSettings[]): Promise<void> {
    await safeMkdir(path.dirname(this.filePath));
    await writeJsonAtomic(this.filePath, { servers });
  }
}

function normalizeStoredServer({ value }: { value: unknown }): IsolationRemoteServerSettings[] {
  if (!value || typeof value !== 'object') {
    return [];
  }
  const record = value as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  const host = typeof record.host === 'string' ? record.host.trim() : '';
  const username = typeof record.username === 'string' ? record.username.trim() : '';
  if (!id || !name || !host || !username) {
    return [];
  }

  return [
    {
      id,
      name,
      host,
      port: normalizePort({ port: record.port }),
      username,
      authMethod: record.authMethod === 'ssh-key' ? 'ssh-key' : 'ssh-agent',
      privateKeyPath: typeof record.privateKeyPath === 'string' ? record.privateKeyPath : undefined,
      githubAuthMode: normalizeGithubAuthMode({ mode: record.githubAuthMode }),
      createdAt: normalizeTimestamp({ value: record.createdAt }),
      updatedAt: normalizeTimestamp({ value: record.updatedAt })
    }
  ];
}

function validateServer({ server }: { server: IsolationRemoteServerSettings }): void {
  if (!server.name || !server.host || !server.username) {
    throw new Error('Remote server name, host and username are required.');
  }
  if (server.authMethod === 'ssh-key' && !server.privateKeyPath) {
    throw new Error('SSH key path is required for ssh-key authentication.');
  }
}

function normalizePort({ port }: { port: unknown }): number {
  const numeric = Number(port || 22);
  return Number.isFinite(numeric) ? Math.min(65535, Math.max(1, Math.floor(numeric))) : 22;
}

function normalizeGithubAuthMode({ mode }: { mode: unknown }): IsolationRemoteServerGithubAuthMode {
  return mode === 'ssh-agent-forwarding' ? 'ssh-agent-forwarding' : 'server-existing';
}

function normalizeTimestamp({ value }: { value: unknown }): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Date.now();
}
