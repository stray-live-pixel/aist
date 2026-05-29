import type { ChildProcess } from 'node:child_process';

/**
 * Что это: безопасно завершает дочерний процесс VS Code.
 * Зачем нужно: e2e не должен оставлять висящие окна и daemon-процессы после завершения теста.
 */
export function stopProcess({ process }: { process: ChildProcess }): void {
  if (process.exitCode !== null || process.killed) {
    return;
  }

  process.kill('SIGTERM');
}
