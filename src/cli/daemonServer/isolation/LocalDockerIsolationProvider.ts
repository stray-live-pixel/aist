import { execFile, spawn } from 'node:child_process';

type ExecResult = {
  readonly stdout: string;
  readonly stderr: string;
};

export type LocalDockerStartInput = {
  readonly sessionId: string;
  readonly repositoryUrl: string;
  readonly branchName: string;
  readonly baseRef?: string;
  readonly env?: Record<string, string | undefined>;
};

export type LocalDockerStartResult = {
  readonly containerId: string;
  readonly containerName: string;
};

export type LocalDockerExecResult = {
  readonly ok: boolean;
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut: boolean;
  readonly durationMs: number;
};

export type LocalDockerSpawnHandle = {
  readonly stop: () => void;
  readonly completed: Promise<LocalDockerExecResult>;
};

/**
 * Local Docker provider used by the detached isolation session manager.
 *
 * It intentionally owns only container lifecycle. Agent execution and PR finalization
 * are layered on top of this provider so VS Code remains just a UI client.
 */
export class LocalDockerIsolationProvider {
  constructor(
    private readonly options: {
      readonly image?: string;
      readonly env?: Record<string, string | undefined>;
    } = {}
  ) {}

  /**
   * Что это: проверяет доступность Docker daemon.
   * Зачем нужно: isolated session должна явно упасть до provisioning, если Docker недоступен.
   * Какую продуктовую проблему решает: пользователь видит понятную ошибку вместо зависшего запуска.
   */
  async healthcheck(): Promise<void> {
    await execFileAsync('docker', ['version', '--format', '{{.Server.Version}}'], {
      env: this.options.env
    });
  }

  /**
   * Что это: запускает автономный контейнер без bind mount локального worktree.
   * Зачем нужно: контейнер должен быть переносимым на удалённый Docker host и сам клонировать GitHub repo.
   * Какую продуктовую проблему решает: isolated agents больше не зависят от файловой системы компьютера пользователя.
   */
  async start(input: LocalDockerStartInput): Promise<LocalDockerStartResult> {
    const containerName = `aist-isolated-${sanitizeContainerName(input.sessionId)}`;
    const image = this.options.image || 'node:20-bookworm';
    const result = await execFileAsync(
      'docker',
      [
        'run',
        '-d',
        '--name',
        containerName,
        '--label',
        'aist.isolated=true',
        '--label',
        `aist.sessionId=${input.sessionId}`,
        ...toDockerEnvArgs(mergeContainerEnv(this.options.env, input.env)),
        '-w',
        '/workspace',
        image,
        'sleep',
        '86400'
      ],
      { env: this.options.env }
    );

    try {
      await this.bootstrapRepository({
        containerName,
        repositoryUrl: input.repositoryUrl,
        branchName: input.branchName,
        baseRef: input.baseRef
      });
    } catch (error) {
      await this.destroy(containerName).catch(() => undefined);
      throw error;
    }

    return {
      containerId: result.stdout.toString().trim(),
      containerName
    };
  }

  /**
   * Что это: выполняет команду внутри контейнера и возвращает stdout/stderr после завершения.
   * Зачем нужно: provisioning/finalization требуют управляемых shell-команд в автономной среде.
   * Какую продуктовую проблему решает: daemon оркестрирует контейнер, не читая и не меняя локальный checkout.
   */
  async exec({
    container,
    script,
    cwd = '.',
    timeoutMs = 120000,
    maxOutputChars = 1000000
  }: {
    container: string;
    script: string;
    cwd?: string;
    timeoutMs?: number;
    maxOutputChars?: number;
  }): Promise<LocalDockerExecResult> {
    return this.spawn({ container, script, cwd, timeoutMs, maxOutputChars }).completed;
  }

  /**
   * Что это: запускает долгую команду внутри контейнера с потоковой обработкой stdout/stderr.
   * Зачем нужно: agent CLI пишет JSONL events постепенно, а локальный daemon должен импортировать их в чат.
   * Какую продуктовую проблему решает: пользователь наблюдает remote-capable isolated run в реальном времени.
   */
  spawn({
    container,
    script,
    cwd = '.',
    timeoutMs = 30 * 60 * 1000,
    maxOutputChars = 1000000,
    onStdout,
    onStderr
  }: {
    container: string;
    script: string;
    cwd?: string;
    timeoutMs?: number;
    maxOutputChars?: number;
    onStdout?: (chunk: string) => void;
    onStderr?: (chunk: string) => void;
  }): LocalDockerSpawnHandle {
    const startedAt = Date.now();
    const dockerCwd = toDockerCwd(cwd);
    const child = spawn('docker', ['exec', '-w', dockerCwd, container, 'bash', '-lc', script], {
      env: this.options.env
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let closed = false;
    let resolveCompleted: (result: LocalDockerExecResult) => void = () => undefined;
    const completed = new Promise<LocalDockerExecResult>((resolve) => {
      resolveCompleted = resolve;
    });
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!closed) child.kill('SIGKILL');
      }, 1500).unref();
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8');
      stdout = appendBounded(stdout, text, maxOutputChars);
      onStdout?.(text);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8');
      stderr = appendBounded(stderr, text, maxOutputChars);
      onStderr?.(text);
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      resolveCompleted({
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
      resolveCompleted({
        ok: exitCode === 0 && !timedOut,
        exitCode,
        signal,
        stdout,
        stderr,
        timedOut,
        durationMs: Date.now() - startedAt
      });
    });

    timeout.unref();
    return {
      stop: () => {
        child.kill('SIGTERM');
        setTimeout(() => {
          if (!closed) child.kill('SIGKILL');
        }, 1500).unref();
      },
      completed
    };
  }

  /**
   * Что это: удаляет контейнер isolated session.
   * Зачем нужно: после завершения/ошибки локальный Docker не должен накапливать фоновые контейнеры.
   * Какую продуктовую проблему решает: пользователь может безопасно запускать много isolated задач.
   */
  async destroy(containerIdOrName: string): Promise<void> {
    if (!containerIdOrName.trim()) {
      return;
    }

    await execFileAsync('docker', ['rm', '-f', containerIdOrName], {
      env: this.options.env
    });
  }

  /**
   * Что это: клонирует репозиторий, ставит AIST и создаёт рабочую ветку внутри контейнера.
   * Зачем нужно: контейнер получает полный source of truth из GitHub, а не через mount локальной директории.
   * Какую продуктовую проблему решает: тот же протокол можно перенести на удалённый Docker host.
   */
  private async bootstrapRepository({
    containerName,
    repositoryUrl,
    branchName,
    baseRef
  }: {
    containerName: string;
    repositoryUrl: string;
    branchName: string;
    baseRef?: string;
  }): Promise<void> {
    const script = [
      'set -euo pipefail',
      'apt-get update >/dev/null',
      'apt-get install -y --no-install-recommends git gh ca-certificates >/dev/null',
      'rm -rf /workspace',
      `git clone ${shellQuote(repositoryUrl)} /workspace`,
      'cd /workspace',
      baseRef ? `git checkout ${shellQuote(baseRef)}` : '',
      `git checkout -B ${shellQuote(branchName)}`,
      'npm ci',
      'npm run build:cli',
      'npm link'
    ]
      .filter(Boolean)
      .join('\n');
    const result = await this.exec({
      container: containerName,
      script,
      cwd: '/',
      timeoutMs: 10 * 60 * 1000,
      maxOutputChars: 200000
    });
    if (!result.ok) {
      throw new Error(`Container bootstrap failed: ${result.stderr || result.stdout || 'unknown error'}`);
    }
  }
}

function execFileAsync(
  file: string,
  args: readonly string[],
  options: { readonly env?: Record<string, string | undefined> } = {}
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    execFile(file, [...args], { env: options.env }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${file} ${args.join(' ')} failed: ${stderr || error.message}`));
        return;
      }

      resolve({ stdout: stdout.toString(), stderr: stderr.toString() });
    });
  });
}

function sanitizeContainerName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.-]/g, '-').slice(0, 48);
}

function toDockerCwd(cwd: string): string {
  const unix = cwd.replace(/\\/g, '/');
  if (unix === '/workspace' || unix === '/workspace/') {
    return '/workspace';
  }
  const normalized = unix.replace(/^\/workspace\/?/, '').replace(/^\/+/, '');
  if (!normalized || normalized === '.') {
    return '/workspace';
  }
  if (normalized.includes('..')) {
    return '/workspace';
  }
  return `/workspace/${normalized}`;
}

function appendBounded(current: string, chunk: string, maxChars: number): string {
  const next = `${current}${chunk}`;
  return next.length > maxChars ? next.slice(next.length - maxChars) : next;
}

function mergeContainerEnv(
  hostEnv: Record<string, string | undefined> | undefined,
  sessionEnv: Record<string, string | undefined> | undefined
): Record<string, string | undefined> {
  return {
    OPENROUTER_API_KEY: hostEnv?.OPENROUTER_API_KEY,
    GH_TOKEN: hostEnv?.GH_TOKEN || hostEnv?.GITHUB_TOKEN,
    GITHUB_TOKEN: hostEnv?.GITHUB_TOKEN || hostEnv?.GH_TOKEN,
    ...sessionEnv
  };
}

function toDockerEnvArgs(env: Record<string, string | undefined>): string[] {
  return Object.entries(env).flatMap(([key, value]) =>
    value && isSafeEnvName(key) ? ['-e', `${key}=${value}`] : []
  );
}

function isSafeEnvName(value: string): boolean {
  return /^[A-Z_][A-Z0-9_]*$/i.test(value);
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}
