import { execFile, spawn } from 'node:child_process';

type ExecResult = {
  readonly stdout: string;
  readonly stderr: string;
};

export type LocalDockerStartInput = {
  readonly sessionId: string;
  readonly worktreePath: string;
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

  async healthcheck(): Promise<void> {
    await execFileAsync('docker', ['version', '--format', '{{.Server.Version}}'], {
      env: this.options.env
    });
  }

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
        '-v',
        `${input.worktreePath}:/workspace`,
        '-w',
        '/workspace',
        image,
        'sleep',
        '86400'
      ],
      { env: this.options.env }
    );

    return {
      containerId: result.stdout.toString().trim(),
      containerName
    };
  }

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
    const startedAt = Date.now();
    const dockerCwd = toDockerCwd(cwd);

    return new Promise((resolve) => {
      const child = spawn('docker', ['exec', '-w', dockerCwd, container, 'bash', '-lc', script], {
        env: this.options.env
      });
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

      timeout.unref();
    });
  }

  async destroy(containerIdOrName: string): Promise<void> {
    if (!containerIdOrName.trim()) {
      return;
    }

    await execFileAsync('docker', ['rm', '-f', containerIdOrName], {
      env: this.options.env
    });
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
