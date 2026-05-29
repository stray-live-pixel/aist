import type { ChildProcess } from 'node:child_process';

/**
 * Что это: собирает stdout/stderr дочернего VS Code процесса.
 * Зачем нужно: если workbench не стартует, e2e-ошибка должна содержать диагностику запуска реального окружения.
 */
export function collectProcessLogs({ process }: { process: ChildProcess }): () => string {
  let output = '';

  process.stdout?.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });
  process.stderr?.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });

  return () => output.trim();
}
