import { spawn } from 'node:child_process';

import type {
  IsolationExecutionProvider,
  IsolationRunnerExecResult,
  IsolationRunnerStartInput,
  IsolationRunnerStartResult
} from '../IsolationExecutionProvider';
import type { IsolationRemoteServerSettings } from '../../../daemonProtocol';

/**
 * Что это: execution provider для isolated agent на выделенном SSH-сервере.
 * Зачем нужно: daemon остаётся source of truth для UI, но команды подготовки, tools и git выполняются не в Docker, а на отдельной машине.
 * Какую продуктовую проблему решает: пользователь может вынести тяжёлую автономную работу агента с ноутбука на сервер.
 */
export class RemoteSshIsolationProvider implements IsolationExecutionProvider {
  constructor(
    private readonly options: {
      readonly server: IsolationRemoteServerSettings;
      readonly env?: Record<string, string | undefined>;
    }
  ) {}

  async healthcheck(): Promise<void> {
    const result = await this.runSsh({
      script: 'command -v bash >/dev/null && command -v git >/dev/null && command -v npm >/dev/null',
      timeoutMs: 15000
    });
    if (!result.ok) {
      throw new Error(result.stderr.trim() || result.stdout.trim() || 'Remote server is unavailable over SSH.');
    }
  }

  async start(input: IsolationRunnerStartInput): Promise<IsolationRunnerStartResult> {
    const workspacePath = `/tmp/aist-isolated-${sanitizeRemoteName(input.sessionId)}`;
    const result = await this.runSsh({
      script: `rm -rf ${quote(workspacePath)} && mkdir -p ${quote(workspacePath)} && printf %s ${quote(workspacePath)}`,
      timeoutMs: 30000
    });
    if (!result.ok) {
      throw new Error(result.stderr.trim() || result.stdout.trim() || 'Failed to prepare remote workspace directory.');
    }

    return {
      containerId: workspacePath,
      containerName: workspacePath,
      workspacePath
    };
  }

  async exec({
    container,
    script,
    cwd = '.',
    timeoutMs = 120000,
    maxOutputChars = 1000000,
    stdin
  }: {
    container: string;
    script: string;
    cwd?: string;
    timeoutMs?: number;
    maxOutputChars?: number;
    stdin?: string;
  }): Promise<IsolationRunnerExecResult> {
    const remoteWorkspacePath = container;
    const remoteCwd = toRemoteCwd({ cwd, workspacePath: remoteWorkspacePath });
    return this.runSsh({
      script: `cd ${quote(remoteCwd)} && ${rewriteWorkspacePath({ script, workspacePath: remoteWorkspacePath })}`,
      timeoutMs,
      maxOutputChars,
      stdin
    });
  }

  async destroy(containerIdOrName: string): Promise<void> {
    if (!containerIdOrName.trim()) {
      return;
    }
    await this.runSsh({ script: `rm -rf ${quote(containerIdOrName)}`, timeoutMs: 30000 });
  }

  private runSsh({
    script,
    timeoutMs = 120000,
    maxOutputChars = 1000000,
    stdin
  }: {
    script: string;
    timeoutMs?: number;
    maxOutputChars?: number;
    stdin?: string;
  }): Promise<IsolationRunnerExecResult> {
    const startedAt = Date.now();
    const args = buildSshArgs({ server: this.options.server });

    return new Promise((resolve) => {
      const child = spawn('ssh', args, { env: this.options.env });
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let closed = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        setTimeout(() => {
          if (!closed) child.kill('SIGKILL');
        }, 1500).unref();
      }, timeoutMs);

      child.stdout.on('data', (chunk: Buffer) => {
        stdout = appendBounded(stdout, chunk.toString('utf8'), maxOutputChars);
      });
      child.stderr.on('data', (chunk: Buffer) => {
        stderr = appendBounded(stderr, chunk.toString('utf8'), maxOutputChars);
      });
      child.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          ok: false,
          exitCode: null,
          signal: null,
          stdout,
          stderr: `${stderr}${stderr ? '\n' : ''}${error.message}`,
          timedOut,
          durationMs: Date.now() - startedAt
        });
      });
      child.on('close', (exitCode, signal) => {
        closed = true;
        clearTimeout(timeout);
        resolve({
          ok: exitCode === 0 && !timedOut,
          exitCode,
          signal,
          stdout,
          stderr,
          timedOut,
          durationMs: Date.now() - startedAt
        });
      });
      child.stdin.end(`${script}${stdin !== undefined ? `\n${stdin}` : ''}`);
      timeout.unref();
    });
  }
}

/**
 * Что это: собирает безопасный ssh command без паролей.
 * Зачем нужно: правильная авторизация — через локальный ssh-agent или файл ключа; пароль в AIST не хранится.
 * Какую продуктовую проблему решает: пользователь не кладёт секреты в workspace или глобальный json настроек.
 */
function buildSshArgs({ server }: { server: IsolationRemoteServerSettings }): string[] {
  return [
    '-p',
    String(server.port || 22),
    '-o',
    'BatchMode=yes',
    '-o',
    'StrictHostKeyChecking=accept-new',
    ...(server.authMethod === 'ssh-key' && server.privateKeyPath ? ['-i', server.privateKeyPath] : []),
    ...(server.githubAuthMode === 'ssh-agent-forwarding' ? ['-A'] : []),
    `${server.username}@${server.host}`,
    'bash',
    '-s'
  ];
}

function toRemoteCwd({ cwd, workspacePath }: { cwd: string; workspacePath: string }): string {
  const unix = cwd.replace(/\\/g, '/');
  if (unix === '/') {
    return '/';
  }
  if (unix === '/workspace' || unix === '/workspace/') {
    return workspacePath;
  }
  const normalized = unix.replace(/^\/workspace\/?/, '').replace(/^\/+/, '');
  if (!normalized || normalized === '.') {
    return workspacePath;
  }
  if (normalized.includes('..')) {
    return workspacePath;
  }
  return `${workspacePath}/${normalized}`;
}

function rewriteWorkspacePath({ script, workspacePath }: { script: string; workspacePath: string }): string {
  return script.replace(/\/workspace/g, workspacePath);
}

function sanitizeRemoteName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.-]/g, '-').slice(0, 48);
}

function quote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function appendBounded(current: string, chunk: string, maxChars: number): string {
  const next = `${current}${chunk}`;
  return next.length > maxChars ? next.slice(next.length - maxChars) : next;
}
